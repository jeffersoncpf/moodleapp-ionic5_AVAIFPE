// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, OnInit, Optional } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import {
    CoreCourseModuleMainResourceComponent,
} from '@features/course/classes/main-resource-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourse, CoreCourseWSModule } from '@features/course/services/course';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreSites } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import {
    AddonModResource,
    AddonModResourceCustomData,
    AddonModResourceProvider,
    AddonModResourceResource,
} from '../../services/resource';
import { AddonModResourceHelper } from '../../services/resource-helper';

/**
 * Component that displays a resource.
 */
@Component({
    selector: 'addon-mod-resource-index',
    templateUrl: 'addon-mod-resource-index.html',
})
export class AddonModResourceIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    component = AddonModResourceProvider.COMPONENT;

    canGetResource = false;
    mode = '';
    src = '';
    contentText = '';
    displayDescription = true;
    warning = '';

    constructor(@Optional() courseContentsPage?: CoreCourseContentsPage) {
        super('AddonModResourceIndexComponent', courseContentsPage);
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.canGetResource = AddonModResource.isGetResourceWSAvailable();

        await this.loadContent();
        try {
            await AddonModResource.logView(this.module.instance!, this.module.name);
            CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        return AddonModResource.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Download resource contents.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async fetchContent(refresh?: boolean): Promise<void> {
        // Load module contents if needed. Passing refresh is needed to force reloading contents.
        await CoreCourse.loadModuleContents(this.module, this.courseId, undefined, false, refresh);

        if (!this.module.contents || !this.module.contents.length) {
            throw new CoreError(Translate.instant('core.filenotfound'));
        }

        let resource: AddonModResourceResource | CoreCourseWSModule | undefined;
        let options: AddonModResourceCustomData = {};

        // Get the resource instance to get the latest name/description and to know if it's embedded.
        if (this.canGetResource) {
            resource = await CoreUtils.ignoreErrors(AddonModResource.getResourceData(this.courseId, this.module.id));
            this.description = resource?.intro || '';
            options = resource?.displayoptions ? CoreTextUtils.unserialize(resource.displayoptions) : {};
        } else {
            resource = await CoreUtils.ignoreErrors(CoreCourse.getModule(this.module.id, this.courseId));
            this.description = resource?.description || '';
            options = resource?.customdata ? CoreTextUtils.unserialize(CoreTextUtils.parseJSON(resource.customdata)) : {};
        }

        try {
            if (resource) {
                this.displayDescription = typeof options.printintro == 'undefined' || !!options.printintro;
                this.dataRetrieved.emit(resource);
            }

            if (AddonModResourceHelper.isDisplayedInIframe(this.module)) {
                const downloadResult = await this.downloadResourceIfNeeded(refresh, true);
                const src = await AddonModResourceHelper.getIframeSrc(this.module);
                this.mode = 'iframe';

                if (this.src && src.toString() == this.src.toString()) {
                    // Re-loading same page.
                    // Set it to empty and then re-set the src in the next digest so it detects it has changed.
                    this.src = '';
                    setTimeout(() => {
                        this.src = src;
                    });
                } else {
                    this.src = src;
                }

                this.warning = downloadResult.failed
                    ? this.getErrorDownloadingSomeFilesMessage(downloadResult.error!)
                    : '';

                return;
            }

            if (resource && 'display' in resource && AddonModResourceHelper.isDisplayedEmbedded(this.module, resource.display)) {
                this.mode = 'embedded';
                this.warning = '';

                this.contentText = await AddonModResourceHelper.getEmbeddedHtml(this.module, this.courseId);
                this.mode = this.contentText.length > 0 ? 'embedded' : 'external';
            } else {
                this.mode = 'external';
                this.warning = '';
            }
        } finally {
            this.fillContextMenu(refresh);
        }
    }

    /**
     * Opens a file.
     *
     * @return Promise resolved when done.
     */
    async open(): Promise<void> {
        let downloadable = await CoreCourseModulePrefetchDelegate.isModuleDownloadable(this.module, this.courseId);

        if (downloadable) {
            // Check if the main file is downloadle.
            // This isn't done in "isDownloadable" to prevent extra WS calls in the course page.
            downloadable = await AddonModResourceHelper.isMainFileDownloadable(this.module);

            if (downloadable) {
                return AddonModResourceHelper.openModuleFile(this.module, this.courseId);
            }
        }

        // The resource cannot be downloaded, open the activity in browser.
        await CoreSites.getCurrentSite()?.openInBrowserWithAutoLoginIfSameSite(this.module.url!);
    }

}
