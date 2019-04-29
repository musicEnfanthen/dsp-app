import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
    SearchParamsService,
    ExtendedSearchParams,
    SearchService
} from '@knora/core';
import { encodeUriQuery } from '@angular/router/src/url_tree';

@Component({
    selector: 'app-expert-search',
    templateUrl: './expert-search.component.html',
    styleUrls: ['./expert-search.component.scss']
})
export class ExpertSearchComponent implements OnInit {
    expertSearchForm: FormGroup;
    gravsearchQuery: string;
    route: string = '/search';

    constructor(
        private fb: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _searchService: SearchService,
        private _searchParamsService: SearchParamsService
    ) {}

    ngOnInit() {
        this.expertSearchForm = this.fb.group({
            gravquery: [
                `
PREFIX knora-api: <http://api.knora.org/ontology/knora-api/simple/v2#>
PREFIX incunabula: <http://0.0.0.0:3333/ontology/0803/incunabula/simple/v2#>

CONSTRUCT {
    ?book knora-api:isMainResource true .
    ?book incunabula:title ?title .

} WHERE {
    ?book a incunabula:book .
    ?book incunabula:title ?title .
}
`,
                Validators.required
            ]
        });
    }

    submitQuery() {
        this.gravsearchQuery = this.generateGravsearch(0);
        console.log('encoded', encodeURIComponent(this.gravsearchQuery));
        /*
        this._searchService.doExtendedSearchReadResourceSequence(this.gravsearchQuery).subscribe(
            (result: any) => {
                console.log('result:', result);
            },
            (error: any) => {
                console.error('gravsearch error', error);
            }
        );
*/

        // this._router.navigate([this.route + '/extended/', this.gravsearchQuery]);
    }

    private generateGravsearch(offset: number = 0): string {
        const queryTemplate = this.expertSearchForm.controls['gravquery'].value;
        console.log('queryTemplate', queryTemplate);

        // offset component of the Gravsearch query
        const offsetTemplate = `
         OFFSET ${offset}
         `;

        // function that generates the same Gravsearch query with the given offset
        const generateGravsearchWithCustomOffset = (
            localOffset: number
        ): string => {
            const offsetCustomTemplate = `
             OFFSET ${localOffset}
             `;

            return queryTemplate + offsetCustomTemplate;
        };

        if (offset === 0) {
            // store the function so another Gravsearch query can be created with an increased offset
            this._searchParamsService.changeSearchParamsMsg(
                new ExtendedSearchParams(generateGravsearchWithCustomOffset)
            );
        }
        return queryTemplate + offsetTemplate;
    }
}