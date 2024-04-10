import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from 'src/app/auth/auth.service';
import { DefaultNumber } from 'src/app/Shared/Enums/Default.enums';
import { environment } from 'src/environments/environment';
import { ManageUserService } from '../user-management/manageuser.service';
import { StatusFilterModel } from '../user-management/models/UserDataModel';
import { ManageAccountDataService } from './manage-account-data.service';
import { SharedService } from 'src/app/Shared/shared.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
    pageSize: number = environment.defaultPageSize;
    pageIndex: number = DefaultNumber.Zero;
    gridSize = "303px";
    pageSizeList = environment.pageSizeList;
    selectedAccountName: string;
    selectedAccountId: string;
    accountName: string;
    ModelrefngbModel: NgbModalRef;
    searchParameter: string = "";
    searchtatusParameter: string = "";
    userData: string[] = [];
    emptyData = new MatTableDataSource([{ empty: "row" }]);
    displayColumns: string[] = [
        "accountname",
        "accountId",
        "client",
        "state",
        "stateChanged",
        "platformPartner",
        "phone",
        "action"
    ];
    userId: number;
    filtereddataSource: FilterDataModel[] = [];
    closeResult = "";
    accountsData: AccountDetailsModel[] = [];
    filterModel: StatusFilterModel;
    recordCount: number = DefaultNumber.Zero;
    @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;

    constructor(private modelService: NgbModal, public _sharedService: SharedService, public authService: AuthService, private _router: Router,
        private _manageAccountDataService: ManageAccountDataService,
        private _manageUserService: ManageUserService) {

        this.filterModel = new StatusFilterModel();
    }
    @HostListener('window:popstate', ['$event'])
    onPopState(event: Event) {
        this._router.navigate(["/auth/login"]);
    }
    ngOnInit(): void {
        this.getAccountList();
        this.userId = this.authService.userName;
    }
    // Paginator for list
    setPaginatorModel(pageNumber: number, pageSize: number) {


        this.filterModel.pageNumber = pageNumber;
        this.filterModel.pageSize = pageSize;

    }

    // Sign in as clerical user method
    signInAsClericalUser() {
        this.modelService.dismissAll();
        localStorage.setItem("role", "AdminAsClerical");
        localStorage.setItem("accountId", this.selectedAccountId);
        localStorage.setItem("accountName", this.selectedAccountName);
        this._router.navigate(["platform/case-manager-dashboard"])
            .then(() => {
                window.location.reload();
            });
    }

    // Search Records method
    Search(type: string): void {
        if (type && type === 'paging') { this.recordCount = this.pageIndex * this.pageSize; }
        else {
            this.recordCount = DefaultNumber.Zero; this.paginator.pageIndex = DefaultNumber.Zero;
        }
    }

    //open Modal method
    open(content: HTMLCollection, accountId: string, accountName: string) {
        this.accountName = accountName;
        this.selectedAccountName = accountName;
        this.selectedAccountId = accountId;
        this.ModelrefngbModel = this.modelService.open(content, {
            ariaLabelledBy: "modal-basic-title",
            windowClass: "auth-update-modal",
            centered: true,
        });
        this.ModelrefngbModel.result.then(
            (result) => {
                this.closeResult = `Closed with: ${result}`;
            },
            (reason) => {
                this.closeResult = "Dismissed";
            }
        );

    }

    // Change pages in list using paginator method
    switchPage(event: Event): void {

        this.filterModel.pageNumber = event.pageIndex + DefaultNumber.One;
        this.filterModel.pageSize = event.pageSize;
        this.setPaginatorModel(
            this.filterModel.pageNumber,
            this.filterModel.pageSize,
        );
        this.getAllData();
    }

    //Show account details method
    viewAccountDetails(accountId: string) {

        this._router.navigate(["platform/dashboard/account-management"], {
            queryParams: { accountId: this._sharedService.encode(accountId) },
        });
    }

    //Get account list api method 
    getAccountList() {

        this._manageAccountDataService
            .GetAllAccounts(this.filterModel)
            .subscribe((data: AccountDetailsModel) => {
                let res = JSON.parse(data);
                if (res) {
                    const list = res.result as Array<AccountDetailsModel>;

                    this.accountsData = list;
                    this.filtereddataSource = this.accountsData;
                    this.recordCount = res.result[0]?.totalRecords;
                } else {
                    this.accountsData = [];
                }
            });
    }

    //get all data of list 
    getAllData() {
        this.filterModel.status = this.searchtatusParameter;
        this._manageUserService.GetAllData(this.filterModel).subscribe((data) => {

            let res = data;
            if (res) {
                const list = res.result as Array<AccountDetailsModel>;

                this.accountsData = list;
                this.filtereddataSource = list;
                this.recordCount = res.result[0]?.totalRecords;
            } else {
                this.accountsData = [];
            }
        });
    }

    //open dropdown popup
    handleStatusSelected(event: string) {
        this.searchtatusParameter = event;
        this.getAllData();
    }
    compare(a: number | string, b: number | string, isAsc: boolean) {
        return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
    }

    //check matching account names
    compareAccountName(a: string, b: string, isAsc: boolean): number {
        // Extract the numeric part from the account name
        const numA = this.extractAccountNumber(a);
        const numB = this.extractAccountNumber(b);

        // Compare the numeric parts
        if (numA !== null && numB !== null) {
            if (numA < numB) {
                return isAsc ? -1 : 1;
            } else if (numA > numB) {
                return isAsc ? 1 : -1;
            }
        }

        // Compare the full account names as strings
        return isAsc ? a.localeCompare(b) : b.localeCompare(a);
    }

    //extract account number for matching
    extractAccountNumber(accountName: string): number | null {
        const matches = accountName.match(/(\d+)$/);
        if (matches) {
            return Number(matches[1]);
        }
        return null;
    }

    //compare date method
    compareDate(a: Date, b: Date, isAsc: boolean) {
        return (
            (new Date(a || 0).getTime() < new Date(b || 0).getTime() ? -1 : 1) *
            (isAsc ? 1 : -1)
        );
    }

    //sort data in list
    sortData(sort: Sort): void {

        const data = this.filtereddataSource.slice();
        if (!sort.active || sort.direction === "") {
            this.filtereddataSource = data;
            return;
        }
        this.accountsData = data.sort((a: AccountDetailsModel, b: AccountDetailsModel) => {
            const isAsc = sort.direction === "asc";
            switch (sort.active) {
                case "accountname":
                    return this.compareAccountName(
                        a.accountName.toLowerCase(),
                        b.accountName.toLowerCase(),
                        isAsc
                    );
                case "accountId":
                    return this.compare(
                        a.accountId === null ? "" : a.accountId,
                        b.accountId === null ? "" : b.accountId,
                        isAsc
                    );
                case "client":
                    return this.compare(
                        a.client === null ? "" : a.client,
                        b.client === null ? "" : b.client,
                        isAsc
                    );
                case "state":
                    return this.compareDate(
                        a.accountState === null ? "" : a.accountState,
                        b.accountState === null ? "" : b.accountState,
                        isAsc
                    );
                case "stateChanged":
                    return this.compareDate(
                        a.accountStateModifiedDate === null ? "" : a.accountStateModifiedDate,
                        b.accountStateModifiedDate === null ? "" : b.accountStateModifiedDate,
                        isAsc
                    );
                case "platformPartner":
                    return this.compare(
                        a.platformPartner === null ? "" : a.platformPartner,
                        b.platformPartner === null ? "" : b.platformPartner,
                        isAsc
                    );
                case "phone":
                    return this.compare(
                        a.accountPhoneNumber === null ? "" : a.accountPhoneNumber,
                        b.accountPhoneNumber === null ? "" : b.accountPhoneNumber,
                        isAsc
                    );

                default:
                    return 0;
            }
        });
    }
}
