/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import CommonControls = require("VSS/Controls/Common");

import TreeViewDataService = require("scripts/TreeViewDataService");


export interface TreeviewSelectedCallback { (type: string, value: string): void }

export class Details {
}

export class DetailsPaneToggler {
    private _previousPaneOnPosition: string;
    private _workItemPaneMode: string;
    private _paneFilter: any;
    private _positionFilter: any;
    private _$farRightPaneHubPivot: any;
    private _savedPaneFilterItem: any;
    private _splitter;

    private _workItemForm;
    private _viewPaneForm;
    private _parent;

    public init(parent, farRightPanelCss, splitter, workItemForm, viewPaneForm) {
        this._parent = parent;
        this._splitter = splitter;
        this._workItemForm = workItemForm;
        this._viewPaneForm = viewPaneForm;
        this._$farRightPaneHubPivot = farRightPanelCss;
    }


    public toggleDetailsPane() {
        if (this._isTestCaseDetailsPaneOn()) {

            this._showWorkItemPane("off", null); //this._paneFilter.getSelectedItem().value);
        }
        else {

            if (this._previousPaneOnPosition) {
                this._showWorkItemPane(this._previousPaneOnPosition, null);//this._paneFilter.getSelectedItem().value);
            }
            else {
                var toggler = this;
                VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                    // Set value in user scope
                    dataService.getValue("PreviousPaneOnPosition", { scopeType: "User" }).then(function (prevPanePosition: any) {
                        if (prevPanePosition && prevPanePosition.value) {
                            toggler._previousPaneOnPosition = prevPanePosition.value;
                        }
                        else {
                            toggler._previousPaneOnPosition = "right";
                        }
                        toggler._showWorkItemPane(toggler._previousPaneOnPosition, null); //toggler._paneFilter.getSelectedItem().value);
                    });

                });
            }
        }

    }

    public _isTestCaseDetailsPaneOn = function () {
        if (this._workItemPaneMode && this._workItemPaneMode !== "off") {
            return true;
        }
        return false;
    }

    public _showWorkItemPane(position, pane) {
         

        //if (position !== "off" && position !== this._positionFilter.getSelectedItem().value) {
        //    var  item = this._positionFilter.getItem(position);
        //    this._positionFilter.setSelectedItem(item);
        //}

      
        this._savedPaneFilterItem = pane;

        if (this._workItemPaneMode !== position) {
            if (position === "off" && this._workItemPaneMode) {

                this._previousPaneOnPosition = this._workItemPaneMode;
                var toggle = this;
                VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                    // Set value in user scope
                    dataService.setValue("PreviousPaneOnPosition", toggle._workItemPaneMode, { scopeType: "User" }).then(function (value) {
                        console.log("User scoped key value is " + value);
                    });
                });


            }
            this._workItemPaneMode = position;
        }
        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            // Set value in user scope
            dataService.setValue("PanePosition", position, { scopeType: "User" });
            dataService.setValue("PaneMode", pane, { scopeType: "User" });
        });

        if (position === "off") {
            this._$farRightPaneHubPivot.css("display", "none");

            //TODO - Ugly toogle
            $("#detailsPane").css("display", "none");
            $("#testCasePane").css("width", "100%");
            $("#detailsPane").css("width", "0%");
            

            //this._splitter.noSplit();
            //this._workItemForm.unbind();
            //this._workItemForm.hideElement();
            //this._viewPaneForm.unbind();
            //this._viewPaneForm.hide();
        }
        else {
            //if (position === "right") {
            //    this._splitter.horizontal();
            //    this._splitter.split();
            //}
            //else {

            //    this._splitter.vertical();
            //    this._splitter.split();
            //}
            if (pane === "TestHubView.paneMode_suites" || pane === "TestHubView.paneMode_results") {
                // selectedTestCaseId = (this._testPointList.getSelectionCount() <= 1) ? selectedTestCaseId : 0;
                // this._showAssociatedNodes(selectedTestCaseId, pane);
            }
            else {

                //this._showWorkItem(selectedTestCaseId, true);
            }
            //TODO - Ugly toogle
            $("#testCasePane").css("width", "80%");
            $("#detailsPane").css("width", "20%");
            $("#detailsPane").css("display", "block");


            this._$farRightPaneHubPivot.css("display", "block");

        }
    };

}


