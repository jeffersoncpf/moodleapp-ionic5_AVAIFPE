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

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { makeSingleton } from '@singletons';

/**
 * Screen breakpoints.
 *
 * @see https://ionicframework.com/docs/layout/grid#default-breakpoints
 */
enum Breakpoint {
    ExtraSmall = 'xs',
    Small = 'sm',
    Medium = 'md',
    Large = 'lg',
    ExtraLarge = 'xl',
}

const BREAKPOINT_NAMES = Object.values(Breakpoint);
const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
    [Breakpoint.ExtraSmall]: 0,
    [Breakpoint.Small]: 576,
    [Breakpoint.Medium]: 768,
    [Breakpoint.Large]: 992,
    [Breakpoint.ExtraLarge]: 1200,
};

/**
 * Screen layouts.
 */
export enum CoreScreenLayout {
    Mobile = 'mobile',
    Tablet = 'tablet',
}

/**
 * Manage application screen.
 */
@Injectable({ providedIn: 'root' })
export class CoreScreenService {

    protected breakpointsSubject: BehaviorSubject<Record<Breakpoint, boolean>>;
    private _layoutObservable: Observable<CoreScreenLayout>;

    constructor() {
        this.breakpointsSubject = new BehaviorSubject(BREAKPOINT_NAMES.reduce((breakpoints, breakpoint) => ({
            ...breakpoints,
            [breakpoint]: false,
        }), {} as Record<Breakpoint, boolean>));

        this._layoutObservable = this.breakpointsObservable.pipe(
            map(this.calculateLayout.bind(this)),
            distinctUntilChanged<CoreScreenLayout>(),
        );
    }

    get breakpoints(): Record<Breakpoint, boolean> {
        return this.breakpointsSubject.value;
    }

    get breakpointsObservable(): Observable<Record<Breakpoint, boolean>> {
        return this.breakpointsSubject.asObservable();
    }

    get layout(): CoreScreenLayout {
        return this.calculateLayout(this.breakpointsSubject.value);
    }

    get layoutObservable(): Observable<CoreScreenLayout> {
        return this._layoutObservable;
    }

    get isMobile(): boolean {
        return this.layout === CoreScreenLayout.Mobile;
    }

    get isTablet(): boolean {
        return this.layout === CoreScreenLayout.Tablet;
    }

    /**
     * Watch viewport changes.
     */
    watchViewport(): void {
        for (const breakpoint of BREAKPOINT_NAMES) {
            const width = BREAKPOINT_WIDTHS[breakpoint];
            const mediaQuery = window.matchMedia(`(min-width: ${width}px)`);

            this.updateBreakpointVisibility(breakpoint, mediaQuery.matches);

            mediaQuery.onchange = (({ matches }) => this.updateBreakpointVisibility(breakpoint, matches));
        }
    }

    /**
     * Update breakpoint visibility.
     *
     * @param breakpoint Breakpoint.
     * @param visible Visible.
     */
    protected updateBreakpointVisibility(breakpoint: Breakpoint, visible: boolean): void {
        if (this.breakpoints[breakpoint] === visible) {
            return;
        }

        this.breakpointsSubject.next({
            ...this.breakpoints,
            [breakpoint]: visible,
        });
    }

    /**
     * Calculate the layout given the current breakpoints.
     *
     * @param breakpoints Breakpoints visibility.
     * @return Active layout.
     */
    protected calculateLayout(breakpoints: Record<Breakpoint, boolean>): CoreScreenLayout {
        if (breakpoints[Breakpoint.Large]) {
            return CoreScreenLayout.Tablet;
        }

        return CoreScreenLayout.Mobile;
    }

}

export const CoreScreen = makeSingleton(CoreScreenService);
