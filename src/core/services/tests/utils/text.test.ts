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

import { DomSanitizer } from '@angular/platform-browser';

import { CoreApp } from '@services/app';
import { CoreTextUtilsProvider } from '@services/utils/text';

import { mock, mockSingleton } from '@/testing/utils';

describe('CoreTextUtilsProvider', () => {

    const config = { platform: 'android' };
    let sanitizer: DomSanitizer;
    let textUtils: CoreTextUtilsProvider;

    beforeEach(() => {
        mockSingleton(CoreApp, [], { isAndroid: () => config.platform === 'android' });

        sanitizer = mock<DomSanitizer>([], { bypassSecurityTrustUrl: url => url });
        textUtils = new CoreTextUtilsProvider(sanitizer);
    });

    it('adds ending slashes', () => {
        const originalUrl = 'https://moodle.org';
        const url = textUtils.addEndingSlash(originalUrl);

        expect(url).toEqual('https://moodle.org/');
    });

    it('doesn\'t add duplicated ending slashes', () => {
        const originalUrl = 'https://moodle.org/';
        const url = textUtils.addEndingSlash(originalUrl);

        expect(url).toEqual('https://moodle.org/');
    });

    it('builds address URL for Android platforms', () => {
        // Arrange
        const address = 'Moodle Spain HQ';

        config.platform = 'android';

        // Act
        const url = textUtils.buildAddressURL(address);

        // Assert
        expect(url).toEqual('geo:0,0?q=Moodle%20Spain%20HQ');

        expect(sanitizer.bypassSecurityTrustUrl).toHaveBeenCalled();
        expect(CoreApp.isAndroid).toHaveBeenCalled();
    });

    it('builds address URL for non-Android platforms', () => {
        // Arrange
        const address = 'Moodle Spain HQ';

        config.platform = 'ios';

        // Act
        const url = textUtils.buildAddressURL(address);

        // Assert
        expect(url).toEqual('http://maps.google.com?q=Moodle%20Spain%20HQ');

        expect(sanitizer.bypassSecurityTrustUrl).toHaveBeenCalled();
        expect(CoreApp.isAndroid).toHaveBeenCalled();
    });

    it('matches glob patterns', () => {
        expect(textUtils.matchesGlob('/foo/bar', '/foo/bar')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar', '/foo/bar/')).toBe(false);
        expect(textUtils.matchesGlob('/foo', '/foo/*')).toBe(false);
        expect(textUtils.matchesGlob('/foo/', '/foo/*')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar', '/foo/*')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar/', '/foo/*')).toBe(false);
        expect(textUtils.matchesGlob('/foo/bar/baz', '/foo/*')).toBe(false);
        expect(textUtils.matchesGlob('/foo/bar/baz', '/foo/**')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar/baz/', '/foo/**')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar/baz', '**/baz')).toBe(true);
        expect(textUtils.matchesGlob('/foo/bar/baz', '**/bar')).toBe(false);
        expect(textUtils.matchesGlob('/foo/bar/baz', '/foo/ba?/ba?')).toBe(true);
    });

});
