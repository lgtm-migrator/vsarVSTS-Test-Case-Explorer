//---------------------------------------------------------------------
// <copyright file="DetailsView.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
//    This is part of the Test Case Explorer extensions
//    from the ALM Rangers. This file contains the implementation
//    of the details view. 
// </summary>
//---------------------------------------------------------------------

/// <reference path='ref/jquery/jquery.d.ts' />
/// <reference path='ref/jqueryui.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path="telemetryclient.ts" />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import Grids = require("VSS/Controls/Grids");
import CtrlCombos = require("VSS/Controls/Combos");
import Menus = require("VSS/Controls/Menus");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Navigation = require("VSS/Controls/Navigation");
import Toggler = require("scripts/DetailsToggle");
import TreeViewDataService = require("scripts/TreeViewDataService");
import Common = require("scripts/Common");


interface IPaneRefresh {
    initialize(view: DetailsView): void;
    hide(): void;
    show(): void;
    masterIdChanged(id: string): void;
}

export class DetailsView {
    public _selectedPane: IPaneRefresh;
    public _toggler: Toggler.DetailsPaneToggler;
    public _waitControl: StatusIndicator.WaitControl;

    private _selectedMasterId: string
    private _PaneLst: IPaneRefresh[];

    public initialize(paneToggler: Toggler.DetailsPaneToggler) {

        this._PaneLst = [];
        this._toggler = paneToggler;
        var view = this;

        var panels = [
            { id: "TestPlan", text: "Test plans" },
            { id: "TestSuites", text: "Test suites", selected: true },
            { id: "TestResults", text: "Test results" },
            { id: "Requirements", text: "Linked requirements" }
        ];

        Controls.create(Navigation.PivotFilter, $("#details-filter-container"), {
            behavior: "dropdown",
            text: "Pane",
            items: panels,
            change: function (item) {
                var command = item.id;
                view.ShowPanel(command);
            }
        });

        Controls.create(Navigation.PivotFilter, $("#details-filter-container"), {
            behavior: "dropdown",
            text: "Position",
            items: [
                { id: "right", text: "Right", selected: true },
                { id: "bottom", text: "Bottom" }

            ],
            change: function (item) {
                var command = item.id;
                view._toggler.setPosition(command);

            }
        });

        view.ShowPanel(panels[1].id);
    }

    public selectionChanged(id: string) {
        if (this._selectedPane != null) {
            this._selectedMasterId = id;
            this._selectedPane.masterIdChanged(id);
        }
    }

    public Refresh(): void {
        this.selectionChanged(this._selectedMasterId);
    }

    private ShowPanel(panel: string) {

        if (this._selectedPane != null) {
            this._selectedPane.hide();
        }

        var pane: IPaneRefresh;

        if (this._PaneLst[panel] == null) {

            switch (panel) {
                case "TestPlan":
                    pane = new testPlanPane();
                    break;
                case "TestResults":
                    pane = new testResultsPane();
                    break;
                case "TestSuites":
                    pane = new partOfTestSuitesPane();
                    break;
                case "Requirements":
                    pane = new linkedRequirementsPane();
                    break;


            }
            pane.initialize(this);
            this._PaneLst[panel] = pane;
        } else {
            pane = this._PaneLst[panel];
        }

        this._selectedPane = pane;
        this._selectedPane.show();
        this._selectedPane.masterIdChanged(this._selectedMasterId);
    }

    public StartLoading(longRunning, message) {
        $("body").css("cursor", "progress");

        if (longRunning) {
            var waitControlOptions: StatusIndicator.IWaitControlOptions = {
                target: $(".wait-control-details-target"),
                message: message,
                cancellable: false,
                cancelTextFormat: "{0} to cancel",
                cancelCallback: function () {
                    console.log("cancelled");
                }
            };

            this._waitControl = Controls.create(StatusIndicator.WaitControl, $(".wait-control-details-target"), waitControlOptions);
            this._waitControl.startWait();
        }
    }

    public DoneLoading() {
        $("body").css("cursor", "default");

        if (this._waitControl != null) {
            this._waitControl.cancelWait();
            this._waitControl.endWait();
            this._waitControl = null;
        }
    }
}

class partOfTestSuitesPane implements IPaneRefresh {
    private _grid;

    public initialize(view: DetailsView) {

        var options = {
            height: "100%",
            width: "100%",
            columns: [
                {
                    text: "", index: "suiteType", width: 20, getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var suiteType = this.getColumnValue(dataIndex, column.index);

                        var d = $("<div class='grid-cell'/>").width(column.width || 100)
                        var dIcon = $("<div class='testpoint-outcome-shade icon'/>").addClass(TreeViewDataService.getIconFromSuiteType(suiteType));
                        d.append(dIcon);

                        return d;
                    }
                },
                { text: "Id", index: "id", width: 50 },
                { text: "Test Plan", index: "plan", width: 100 },
                { text: "Suite", index: "suite", width: 150 },

            ],
            // This data source is rendered into the Grid columns defined above
            source: null
        };

        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#details-gridTestSuites"), options);

        var menuItems: any[] = [
            { id: "refresh", showText: false, title: "Refresh grid", icon: "bowtie-navigate-refresh", cssClass: "bowtie-icon" },
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {

                    case "refresh":
                        view.Refresh();
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#detailsMenuBar-testSuite-container"), menubarOptions);

    }

    public show() {
        $("#details-testSuites").css("display", "block");
        $("#details-title").text("Associated test suites");
    }

    public hide() {
        $("#details-testSuites").css("display", "none");
    }

    public masterIdChanged(id: string) {
        TelemetryClient.getClient().trackPageView("Details.PartOfTestSuite");
        var pane = this;
        if (id == null) {
            pane._grid.setDataSource(null);
        }
        else {
            TreeViewDataService.getTestSuitesForTestCase(parseInt(id)).then(
                data=> {
                    if (data != null) {
                        $("#details-gridTestSuites").show();
                        pane._grid.setDataSource(data.map(function (i) { return { id: i.id, suite: i.name, plan: i.plan.name, suiteType: i.suiteType }; }));
                    }
                    else {
                        $("#details-gridTestSuites").hide();
                    }
                    
                },
                err => {
                    $("#details-gridTestSuites").hide();
                }
            );
        }
    }
}

class testPlanPane implements IPaneRefresh {
    private _cbo: CtrlCombos.Combo;
    private _testPlans;
    private _view: DetailsView;
    private _grid;

    public initialize(view: DetailsView) {
        this._view = view;
        var tpp = this;

        var cboOptions: CtrlCombos.IComboOptions = {
            mode: "drop",
            allowEdit: false,
        };

        this._cbo = Controls.create(CtrlCombos.Combo, $("#details-cboTestPlan"), cboOptions);

        TreeViewDataService.getTestPlans().then(
            data=> {
                tpp._testPlans = data[0].children;
                tpp._cbo.setSource(tpp._testPlans.map(i=> { return i.text;}));
            },
            err=> {
                console.log(err);
                TelemetryClient.getClient().trackException(err);
            }
        );

        var treeOptionsTestPlan = {
            width: 400,
            height: "100%",
            nodes: null
        };

        var treeviewTestPlan = Controls.create(TreeView.TreeView, $("#details-treeviewTestPlan"), treeOptionsTestPlan);

        treeviewTestPlan.onItemClick = function (node, nodeElement, e) {
        };

        $("#details-cboTestPlan").change(function () {
            tpp._view.StartLoading(true, "Fetching test plan " + tpp._cbo.getText());
            var tp = tpp._testPlans[tpp._cbo.getSelectedIndex()];
            TreeViewDataService.getTestPlanAndSuites(tp.id, tp.text).then(
                data=> {
                    tpp._view.DoneLoading();
                    treeviewTestPlan.rootNode.clear();

                    treeviewTestPlan.rootNode.addRange(data);
                    treeviewTestPlan._draw();

                    var gridTC = <Grids.Grid>Controls.Enhancement.getInstance(Grids.GridO, $("#grid-container"));

                    $("li.node").droppable({
                        scope: "test-case-scope",
                        greedy: true,
                        tolerance: "pointer",
                        hoverClass: "droppable-hover",
                        drop: function (event, ui) {
                            var n = treeviewTestPlan.getNodeFromElement(event.target);
                            var grd = <Grids.Grid>Controls.Enhancement.getInstance(Grids.Grid, $("#grid-container"));
                            var tcId = ui.draggable.context.childNodes[0].textContent;
                            //var x = grd.getDraggingRowInfo();
                            //Grids.Grid.getInstance($("#grid-container"));
                            var s = "Mapped test case " + tcId + " to suite " + n.config.suiteId + " in test plan " + n.config.testPlanId;
                            var div = $("<div />").text(s);
                            ui.draggable.context = div[0];
                            TreeViewDataService.mapTestCaseToSuite(VSS.getWebContext().project.name, tcId, n.config.suiteId, n.config.testPlanId).then(
                                data => { alert(s); },
                                err => { alert(err); });
                        }
                    });
                },
                err=> {
                    console.log("Err fetching test plans");
                    console.log(err);
                });
        });

        $(".ui-draggable").draggable({
            revert: true,
            appendTo: document.body,
            helper: "clone",
            zIndex: 1000,
            refreshPositions: true
        });

        var menuItems: any[] = [
            { id: "refresh", showText: false, title: "Refresh grid", icon: "bowtie-navigate-refresh", cssClass: "bowtie-icon" },
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {

                    case "refresh":
                        view.Refresh();
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#detailsMenuBar-testPlan-container"), menubarOptions);
    }

    public show() {
        $("#details-TestPlan").css("display", "block");
        $("#details-title").text("Test plans");
    }

    public hide() {
        $("#details-TestPlan").css("display", "none");
    }

    public masterIdChanged(id: string) {
        TelemetryClient.getClient().trackPageView("Details.TestPlans");
        //var pane = this;
        //if (id == null) {
        //    pane._grid.setDataSource(null);
        //}
        //else {
        //    TreeViewDataService.getTestSuitesForTestCase(parseInt(id)).then(
        //        data => {
        //            if (data != null) {
        //                $("#details-gridTestSuites").show();
        //                pane._grid.setDataSource(data.map(function (i) { return { id: i.id, suite: i.name, plan: i.plan.name, suiteType: i.suiteType }; }));
        //            }
        //            else {
        //                $("#details-gridTestSuites").hide();
        //            }

        //        },
        //        err => {
        //            $("#details-gridTestSuites").hide();
        //        }
        //    );
        //}
    }
}

class testResultsPane implements IPaneRefresh {
    private _grid;

    public initialize(view: DetailsView) {
        var options = {
            height: "100%",
            width: "100%",
            columns: [
                {
                    text: "Outcome", index: "Outcome", width: 75, getCellContents: Common.getTestResultCellContent
                },

                { text: "Configuration", index: "Configuration", width: 75 },
                { text: "Run by", index: "RunBy", width: 150 },
                { text: "Date ", index: "Date", width: 150 },
                { text: "Duration", index: "suite", width: 150 }
            ],
            // This data source is rendered into the Grid columns defined above
            source: null
        };

        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#details-gridTestResults"), options);

        var menuItems: any[] = [
            { id: "refresh", showText: false, title: "Refresh grid", icon: "bowtie-navigate-refresh", cssClass: "bowtie-icon" },
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {

                    case "refresh":
                        view.Refresh();
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#detailsMenuBar-TestResults-container"), menubarOptions);
    }

    public hide() {
        $("#details-TestResults").css("display", "none");
    }

    public show() {
        $("#details-TestResults").css("display", "block");
        $("#details-title").text("Recent test results");
    }

    public masterIdChanged(id: string) {
        TelemetryClient.getClient().trackPageView("Details.TestResults");
        var pane = this;
        if (id == null) {
            pane._grid.setDataSource(null);
        }
        else {
            TreeViewDataService.getTestResultsForTestCase(parseInt(id)).then(
                data => {
                    var ds = data.map(function (i) { return { id: i.id, Outcome: i.outcome, Configuration: i.configuration.name, RunBy: (i.runBy == null ? "" : i.runBy.displayName), Date: i.completedDate }; });
                    pane._grid.setDataSource(ds);
                },
                err => {
                    pane._grid.setDataSource(null);
                });
        }
    }
}

class linkedRequirementsPane implements IPaneRefresh {
    private _grid;

    public initialize(view: DetailsView) {
        var options: Grids.IGridOptions = {
            height: "100%",
            width: "100%",
            columns: [
                { text: "Id", index: "System.Id", width: 50 },
                { text: "State", index: "System.State", width: 75 },
                { text: "Title", index: "System.Title", width: 150 },
            ],
            // This data source is rendered into the Grid columns defined above
            source: null
        };

        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#details-gridReq"), options);


        var menuItems: any[] = [
            { id: "refresh", showText: false, title: "Refresh grid", icon: "bowtie-navigate-refresh", cssClass: "bowtie-icon" },
        ];

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {

                    case "refresh":
                        view.Refresh();
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#detailsMenuBar-linkedReq-container"), menubarOptions);

    }

    public hide() {
        $("#details-linkedReq").css("display", "none");
    }

    public show() {
        $("#details-linkedReq").css("display", "block");
        $("#details-title").text("Linked requirements");
    }

    public masterIdChanged(id: string) {
        TelemetryClient.getClient().trackPageView("Details.LinkedRequirements");
        var pane = this;
        pane._grid.setDataSource(null);
        if (id != null) {
            TreeViewDataService.getLinkedRequirementsForTestCase(parseInt(id)).then(
                data => {
                    if (data != null) {
                        pane._grid.setDataSource(data.map(r => { return r.fields; }));
                    }
                    else {
                        pane._grid.setDataSource(null);
                    }
                },
                err=> {
                    pane._grid.setDataSource(null);
                }
            );
        }
    }
}
