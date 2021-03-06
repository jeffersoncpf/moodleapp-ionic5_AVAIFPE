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

import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { IonContent, IonRouterOutlet } from '@ionic/angular';
import { CoreScreen } from '@services/screen';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

export enum CoreSplitViewMode {
    MenuOnly = 'menu-only', // Hides content.
    ContentOnly = 'content-only', // Hides menu.
    MenuAndContent = 'menu-and-content', // Shows both menu and content.
}

@Component({
    selector: 'core-split-view',
    templateUrl: 'split-view.html',
    styleUrls: ['split-view.scss'],
})
export class CoreSplitViewComponent implements AfterViewInit, OnDestroy {

    @ViewChild(IonContent) menuContent!: IonContent;
    @ViewChild(IonRouterOutlet) contentOutlet!: IonRouterOutlet;
    @Input() placeholderText = 'core.emptysplit';
    @Input() mode?: CoreSplitViewMode;
    isNested = false;

    private outletRouteSubject: BehaviorSubject<ActivatedRouteSnapshot | null> = new BehaviorSubject(null);
    private subscriptions?: Subscription[];

    constructor(private element: ElementRef<HTMLElement>) {}

    get outletRoute(): ActivatedRouteSnapshot | null {
        return this.outletRouteSubject.value;
    }

    get outletActivated(): boolean {
        return this.contentOutlet.isActivated;
    }

    get outletRouteObservable(): Observable<ActivatedRouteSnapshot | null> {
        return this.outletRouteSubject.asObservable();
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        this.isNested = !!this.element.nativeElement.parentElement?.closest('core-split-view');
        this.subscriptions = [
            this.contentOutlet.activateEvents.subscribe(() => {
                this.updateClasses();
                this.outletRouteSubject.next(this.contentOutlet.activatedRoute.snapshot);
            }),
            this.contentOutlet.deactivateEvents.subscribe(() => {
                this.updateClasses();
                this.outletRouteSubject.next(null);
            }),
            CoreScreen.layoutObservable.subscribe(() => this.updateClasses()),
        ];

        this.updateClasses();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscriptions?.forEach(subscription => subscription.unsubscribe());
    }

    /**
     * Update host classes.
     */
    private updateClasses(): void {
        const classes: string[] = [this.getCurrentMode()];

        if (this.contentOutlet.isActivated) {
            classes.push('outlet-activated');
        }

        if (this.isNested) {
            classes.push('nested');
        }

        this.element.nativeElement.setAttribute('class', classes.join(' '));
    }

    /**
     * Get the current mode. Depending on the layout, outlet status, and whether this split view
     * is nested or not, this method will indicate which parts of the split view should be visible.
     *
     * @return Split view mode.
     */
    private getCurrentMode(): CoreSplitViewMode {
        if (this.mode) {
            return this.mode;
        }

        if (this.isNested) {
            return CoreSplitViewMode.MenuOnly;
        }

        if (CoreScreen.isMobile) {
            return this.contentOutlet.isActivated
                ? CoreSplitViewMode.ContentOnly
                : CoreSplitViewMode.MenuOnly;
        }

        return CoreSplitViewMode.MenuAndContent;
    }

}
