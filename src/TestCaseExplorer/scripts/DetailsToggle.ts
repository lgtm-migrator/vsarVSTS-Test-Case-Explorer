/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import CommonControls = require("VSS/Controls/Common");

import TreeViewDataService = require("scripts/TreeViewDataService");


export interface TreeviewSelectedCallback { (type: string, value: string): void }

export class Details {
}

    var panelToggler = this;
    

export class DetailsPaneToggler {
    private _previousPaneOnPosition: string;
    private _previousPaneOnWidth: number;
    private _PanePosition: string;
    
    private _positionFilter: any;
    private _$farRightPaneHubPivot: any;
  //  private _savedPaneFilterItem: any;
    private _splitter: CommonControls.Splitter;

    private _MasterForm;
    private _detailsForm;
    private _parent;


    

    public init(parent, farRightPanelCss, splitter: CommonControls.Splitter, masterForm, detailsForm): IPromise<DetailsPaneToggler>  {
        var deferred = $.Deferred<DetailsPaneToggler>(); 
        this._parent = parent;
        this._splitter = splitter;
        this._MasterForm = masterForm;
        this._detailsForm= detailsForm;
        this._$farRightPaneHubPivot = farRightPanelCss;

        
        var toggler = this;
        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            // Set value in user scope
            dataService.getValue("PanePosition", { scopeType: "User" }).then(function (savedPanePosition: any) {
                dataService.getValue("PreviousDetailsPaneWidth", { scopeType: "User" }).then(function (savedDetailsPaneWidth: number) {
              
                    if (savedDetailsPaneWidth == null) {
                        savedDetailsPaneWidth = 100;
                    }
                    if (savedPanePosition == null) {
                        savedPanePosition = "off";
                    }

                    toggler.setTogglerAndPanesPosition(savedPanePosition, savedDetailsPaneWidth);
                    deferred.resolve(toggler);
                });
            });
        });
        return deferred.promise();
        
    }


    public toggleDetailsPane() {
        if (this._isTestCaseDetailsPaneOn()) {

            this._showDetailsPane("off"); 
        }
        else {

            if (this._previousPaneOnPosition) {
                this._showDetailsPane(this._previousPaneOnPosition);
            }
            else {
                var toggler = this;
                VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                    // Set value in user scope
                    dataService.getValue("PreviousPaneOnPosition", { scopeType: "User" }).then(function (prevPanePosition: any) {
                        if (prevPanePosition != null && prevPanePosition != "off") {
                            toggler._previousPaneOnPosition = prevPanePosition;
                        }
                        else {
                            toggler._previousPaneOnPosition = "right";
                        }
                        toggler._showDetailsPane(toggler._previousPaneOnPosition);
                    });

                });
            }
        }
    }

    public setPosition(pos: string) {
    
        this._showDetailsPane(pos);
    }

  
    public _isTestCaseDetailsPaneOn = function () {
        if (this._PanePosition && this._PanePosition !== "off") {
            return true;
        }
        return false;
    }

    public _showDetailsPane(position) {
         

        if (this._PanePosition !== position) {
            if (position === "off" && this._PanePosition) {

                var toggle = this;

                var width = toggle._splitter.rightPane.width();
                width = (width = 0 ? 200 : width);
                toggle._previousPaneOnWidth = width;

                toggle._previousPaneOnPosition = toggle._PanePosition;
                
                VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
                    // Set value in user scope
                    dataService.setValue("PreviousPaneOnPosition", toggle._PanePosition, { scopeType: "User" }).then(function (value) {
                        console.log("User scoped key value is " + value);
                    });
                    dataService.setValue("PreviousDetailsPaneWidth", toggle._previousPaneOnWidth, { scopeType: "User" }).then(function (value) {
                        console.log("User scoped key value is " + value);
                    });
                });


            }
            this._PanePosition = position;
        }
        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            // Set value in user scope
            dataService.setValue("PanePosition", position, { scopeType: "User" });

        });    
        
        this.setTogglerAndPanesPosition(position, this._previousPaneOnWidth);

      
    };

    public setTogglerAndPanesPosition(position:string, width:any) {

        if (this._splitter == null) {
            this._splitter = <CommonControls.Splitter>Controls.Enhancement.getInstance(CommonControls.Splitter, $(".right-hub-splitter"));

        }
        if (position === "off") {
            this._$farRightPaneHubPivot.css("display", "none");

            this._splitter.noSplit();
            //this._MasterForm.unbind();
            //this._MasterForm.hideElement();
            //this._detailsForm.unbind();
            //this._detailsForm.hide();
        }
        else {
            if (position === "right") {
                this._splitter.horizontal();
                this._splitter.split();
            }
            else {
                this._splitter.vertical();
                this._splitter.split();
            }    
            this._splitter.toggleExpanded(true) 
            this._splitter.resize(width);
            this._$farRightPaneHubPivot.css("display", "block");
        }

        this._PanePosition = position;
        this._previousPaneOnWidth = width;       
    }
}


