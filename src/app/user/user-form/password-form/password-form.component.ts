import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { KuiMessageData } from '@knora/action';
import { AuthenticationService } from '@knora/authentication';
import { ApiServiceError, User, UsersService, Utils } from '@knora/core';
import { CacheService } from 'src/app/main/cache/cache.service';

@Component({
    selector: 'app-password-form',
    templateUrl: './password-form.component.html',
    styleUrls: ['./password-form.component.scss']
})
export class PasswordFormComponent implements OnInit {

    // progress indicator
    loading: boolean;
    // in case of an api error
    errorMessage: ApiServiceError;

    // in case of updating data: was it succesful or does it failed
    apiResponses: KuiMessageData[] = [
        {
            status: 200,
            statusText: 'You have successfully updated your password.'
        },
        {
            status: 200,
            statusText: 'You have successfully updated user\'s password.'
        },
        {
            status: 400,
            statusText: 'This wasn\'t successfull. Something went wrong.'

        }
    ];

    showResponse: KuiMessageData;

    // update password for:
    @Input() username: string;
    user: User;

    loggedInUserName: string;

    // output to close dialog
    @Output() closeDialog: EventEmitter<any> = new EventEmitter<any>();

    // in case of child component inside parent form
    @Output() sendToParent: EventEmitter<string> = new EventEmitter<string>();

    // who is logged in?
    // loggedInUserName: string;
    // update own password?
    updateOwn: boolean;

    // depending on updateOwn: showPasswordForm or showConfirmForm
    showPasswordForm: boolean;

    // password form
    form: FormGroup;

    matchingPasswords: boolean = false;

    // in case of change not own password, we need a sys admin confirm password form
    confirmForm: FormGroup;

    // error checking on the following fields
    formErrors = {
        requesterPassword: '',
        password: '',
        confirmPassword: ''
    };

    // ...and the error hints
    validationMessages = {
        requesterPassword: {
            required: 'The old password is required'
        },
        password: {
            required: 'Password is required.',
            minlength: 'Use at least 8 characters.',
            pattern:
                'The password should have at least one uppercase letter and one number.'
        },
        confirmPassword: {
            required: 'You have to confirm your password.',
            match: 'Password mismatch.'
        }
    };

    // visibility of password
    showRequesterPassword = false;
    showPassword = false;
    showConfirmPassword = false;

    constructor (
        private _cache: CacheService,
        private _auth: AuthenticationService,
        private _usersService: UsersService,
        private _fb: FormBuilder
    ) { }

    ngOnInit() {

        this.loading = true;

        const session = JSON.parse(localStorage.getItem('session'));

        if (this.username) {
            // edit mode
            if (session.user.name === this.username) {
                // update own password
                this.updateOwn = true;
            } else {
                // update not own password, if logged-in user is system admin
                if (session.user.sysAdmin) {
                    this.loggedInUserName = session.user.name;
                    this.updateOwn = false;
                }
            }
            this.showPasswordForm = this.updateOwn;


            // set/get cached user data
            this._cache.get(this.username, this._usersService.getUserByUsername(this.username));

            this._cache.get(this.username, this._usersService.getUserByUsername(this.username)).subscribe(
                (response: User) => {
                    this.user = response;
                },
                (error: ApiServiceError) => {
                    console.error(error);
                }
            );

            if (!this.updateOwn) {
                this.buildConfirmForm();
            } else {
                this.buildForm();
            }

        } else {
            // create new password
            this.updateOwn = false;
            this.showPasswordForm = true;
            this.buildForm();
        }
    }

    buildConfirmForm() {
        this.confirmForm = this._fb.group({
            requesterPassword: new FormControl(
                {
                    value: '',
                    disabled: false
                },
                [
                    Validators.required
                ]
            )
        });

        this.confirmForm.valueChanges.subscribe(data => { this.onValueChanged(this.confirmForm, data); });

        this.onValueChanged(this.confirmForm); // (re)set validation messages now

        this.loading = false;
    }

    buildForm() {

        const requesterPassword = ((this.updateOwn || !this.confirmForm) ? '' : this.confirmForm.controls.requesterPassword.value);

        const name = (this.username ? this.username : '');

        this.form = this._fb.group({
            username: new FormControl({
                value: name,
                disabled: !this.username
            }),
            requesterPassword: new FormControl(
                {
                    value: requesterPassword,
                    disabled: false
                },
                [
                    Validators.required
                ]
            ),
            password: new FormControl(
                {
                    value: '',
                    disabled: false
                },
                [
                    Validators.required,
                    Validators.minLength(8),
                    Validators.pattern(Utils.RegexPassword)
                ]
            ),
            confirmPassword: new FormControl(
                {
                    value: '',
                    disabled: false
                },
                [
                    Validators.required
                ]
            )
        });

        this.form.valueChanges.subscribe(data => {

            this.onValueChanged(this.form, data);

            // compare passwords here
            if (this.form.controls.password.dirty && this.form.controls.confirmPassword.dirty) {

                this.matchingPasswords = this.form.controls.password.value === this.form.controls.confirmPassword.value;

                this.formErrors['confirmPassword'] += (this.matchingPasswords ? '' : this.validationMessages['confirmPassword'].match);

            }

            if (this.matchingPasswords && !this.formErrors['password'] && !this.formErrors['confirmPassword']) {
                this.sendToParent.emit(this.form.controls.password.value);
            } else {
                this.sendToParent.emit('');
            }

        });

        this.onValueChanged(this.form); // (re)set validation messages now

        this.loading = false;
    }


    onValueChanged(form: FormGroup, data?: any) {
        // const form = this.userPasswordForm;

        Object.keys(this.formErrors).map(field => {
            this.formErrors[field] = '';
            const control = form.get(field);
            if (control && control.dirty && !control.valid) {
                const messages = this.validationMessages[field];
                Object.keys(control.errors).map(key => {
                    this.formErrors[field] += messages[key] + ' ';
                });
            }
        });
    }

    // confirm sys admin
    nextStep() {

        // reset response message
        this.showResponse = undefined;

        this.loading = true;

        // submit requester password with logged-in username
        this._auth.login(this.loggedInUserName, this.confirmForm.controls.requesterPassword.value).subscribe(
            (result: any) => {
                // go to next step with password form
                this.showPasswordForm = !this.showPasswordForm;
                // this.requesterPass = this.confirmForm.controls.requesterPassword.value;
                this.buildForm();
                this.loading = false;
            },
            (error: ApiServiceError) => {
                console.error(error);
                this.showResponse = this.apiResponses[2];
                this.loading = false;
            }
        );
    }

    submitData() {

        // reset response message
        this.showResponse = undefined;

        this.loading = true;

        const requesterPassword = (this.updateOwn ? this.form.controls.requesterPassword.value : this.confirmForm.controls.requesterPassword.value);

        this._usersService.updateUsersPassword(this.user.id, requesterPassword, this.form.controls.password.value).subscribe(
            (result: User) => {
                this.showResponse = (this.updateOwn ? this.apiResponses[0] : this.apiResponses[1]);
                this.form.reset();
                this.loading = false;
            },
            (error: ApiServiceError) => {
                console.error(error);
                this.showResponse = this.apiResponses[2];
                this.loading = false;
            }
        );


    }

    closeMessage(status?: number) {

        this.showResponse = undefined;

        switch (status) {
            case 200:
                // success: close message (and dialog box)
                this.closeDialog.emit();
                break;

            case 400:
                // something went wrong: reset form
                this.form.reset();
                if (this.confirmForm) {
                    this.confirmForm.reset();
                }
                break;

            default:
            // close message

        }

    }

}