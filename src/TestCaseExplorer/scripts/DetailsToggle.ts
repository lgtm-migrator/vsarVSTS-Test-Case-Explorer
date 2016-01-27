//---------------------------------------------------------------------
// <copyright file="DetailsToggle.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file contains the logic 
//    for toggling the details pane.
// </summary>
//---------------------------------------------------------------------

/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import SplitterControls = require("VSS/Controls/Splitter");
import TreeViewDataService = require("scripts/TreeViewDataService");
import Q = require("q");


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
    private _splitter: SplitterControls.Splitter;
    private _MasterForm;
    private _detailsForm;
    private _parent;

    public init(parent, farRightPanelCss, splitter: SplitterControls.Splitter, masterForm, detailsForm): IPromise<DetailsPaneToggler>  {
        var deferred = $.Deferred<DetailsPaneToggler>(); 
        this._parent = parent;
        this._splitter = splitter;
        this._MasterForm = masterForm;
        this._detailsForm= detailsForm;
        this._$farRightPaneHubPivot = farRightPanelCss;
        
        var toggler = this;
        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {

            var posReq = dataService.getValue("PanePosition", { scopeType: "User" });
            var widthReq = dataService.getValue("PreviousDetailsPaneWidth", { scopeType: "User" });
            var prevPanePosReq = dataService.getValue("PreviousPaneOnPosition", { scopeType: "User" });
            
           
            Q.all([posReq, widthReq, prevPanePosReq    ]).then( data => {
                var savedPanePosition: any = data[0]; 
                var savedDetailsPaneWidth: any =data[1]
                var prevPanePosition: any = data[2];
              
                if (savedDetailsPaneWidth == null || savedDetailsPaneWidth == "") {
                    savedDetailsPaneWidth = 160;
                }
                if (savedPanePosition == null || savedPanePosition == "") {
                    savedPanePosition = "off";
                }

                if (prevPanePosition != null && prevPanePosition != "" && prevPanePosition != "off") {
                    toggler._previousPaneOnPosition = prevPanePosition;
                }
                else {
                    toggler._previousPaneOnPosition = "right";
                }


                toggler.setTogglerAndPanesPosition(savedPanePosition, savedDetailsPaneWidth);

                toggler._splitter._element.on('changed', function () {
                    toggler.saveWidth();
                });

                deferred.resolve(toggler);                
            }, err=> {

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
        }
    }

    public setPosition(pos: string) {
        this._showDetailsPane(pos);
    }

    public saveWidth() {
        var toggle = this;

      
        var width = toggle._PanePosition == "right" ? toggle._splitter.rightPane.width() : toggle._splitter.rightPane.height();
        width = (width == 0 ? 200 : width);
        toggle._previousPaneOnWidth = width;

        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            // Set value in user scope
            dataService.setValue("PreviousDetailsPaneWidth", toggle._previousPaneOnWidth, { scopeType: "User" }).then(function (value) {
            });
        });
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

                var width = toggle._PanePosition == "right" ? toggle._splitter.rightPane.width() : toggle._splitter.rightPane.height();
                width = (width == 0 ? 200 : width);
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
            this._splitter = <SplitterControls.Splitter>Controls.Enhancement.getInstance(SplitterControls.Splitter, $(".right-hub-splitter"));

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


