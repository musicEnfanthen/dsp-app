import { Component, Inject, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ApiResponseData, ApiResponseError, KnoraApiConnection, ReadUser, UserResponse } from '@dasch-swiss/dsp-js';
import { DspApiConnectionToken, Session, SessionService } from '@dasch-swiss/dsp-ui';
import { CacheService } from 'src/app/main/cache/cache.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

    loading: boolean = true;

    user: ReadUser;

    session: Session;
    username: string;
    sysAdmin: boolean = false;

    showSystemProjects: boolean = this.sysAdmin;

    constructor(
        @Inject(DspApiConnectionToken) private _dspApiConnection: KnoraApiConnection,
        private _cache: CacheService,
        private _session: SessionService,
        private _titleService: Title) {
        // get username
        this.session = this._session.getSession();
        this.username = this.session.user.name;
        this.sysAdmin = this.session.user.sysAdmin;

        this.showSystemProjects = this.sysAdmin;

        // set the page title
        this._titleService.setTitle(this.username);
    }

    ngOnInit() {

        this.loading = true;

        // set the cache
        this._cache.get(this.username, this._dspApiConnection.admin.usersEndpoint.getUserByUsername(this.username));

        // get from cache
        this._cache.get(this.username, this._dspApiConnection.admin.usersEndpoint.getUserByUsername(this.username)).subscribe(
            (response: ApiResponseData<UserResponse>) => {
                this.user = response.body.user;
                this.loading = false;
            },
            (error: ApiResponseError) => {
                console.error(error);
            }
        );

    }

}

