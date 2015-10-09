/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/jqueryui.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import Grids = require("VSS/Controls/Grids");
import CtrlCombos = require("VSS/Controls/Combos");
import Menus = require("VSS/Controls/Menus");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Navigation = require("VSS/Controls/Navigation");
import Toggler = require("scripts/DetailsToggle");
import TreeViewDataService = require("scripts/TreeViewDataService");

interface IPaneRefresh {
    initialize(view: DetailsView): void,
    hide(): void,
    show(): void;
    masterIdChanged(id: string): void
}

export class DetailsView {
    public _selectedPane: IPaneRefresh;
    public _toggler: Toggler.DetailsPaneToggler;
    public _waitControl: StatusIndicator.WaitControl;

    private _PaneLst: IPaneRefresh[];

    public initialize(paneToggler: Toggler.DetailsPaneToggler) {
   
        this._PaneLst = [];
        this._toggler = paneToggler;
        var view = this;

        var panels = [
            { id: "TestPlan", text: "Test plan", selected: true },
            { id: "TestSuites", text: "Test suites", icon: "icon-commented-file" },
            { id: "TestResults", text: "Test results" }
        ];

        Controls.create(Navigation.PivotFilter, $("#details-filterPane-container"), {
            behavior: "dropdown",
            text: "Pane",
            items: panels,
            change: function (item) {
                var command = item.id;
                view.ShowPanel(command);
            }
        });
        
        Controls.create(Navigation.PivotFilter, $("#details-filterPosition-container"), {
            behavior: "dropdown",
            text: "Position",
            items: [
                { id: "right", text: "Right", selected: true  },
                { id: "bottom", text: "Bottom" }

            ],
            change: function (item) {
                var command = item.id;
                view._toggler.setPosition(command);

            }
        });
         view.ShowPanel(panels[0].id);
    }

    public selectionChanged(id: string)
    {
        if (this._selectedPane != null) {
            this._selectedPane.masterIdChanged(id);
        }
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
            }
            pane.initialize(this);
            this._PaneLst[panel] = pane;
        } else {
            pane = this._PaneLst[panel];
        }

        this._selectedPane = pane;
        this._selectedPane.show();
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
            }
            //this._waitControl = Controls.create(StatusIndicator.WaitControl, $(".wait-control-details-target"), waitControlOptions);
            //this._waitControl.startWait();
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

 class partOfTestSuitesPane implements IPaneRefresh
    {

     private _grid;

     public initialize(view: DetailsView) {
         
         var options = {
             height: "1000px", // Explicit height is required for a Grid control
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
                 // text is the column header text. 
                 // index is the key into the source object to find the data for this column
                 // width is the width of the column, in pixels
                 { text: "Id", index: "id", width: 50 },
                 { text: "Test Plan", index: "plan", width: 50 },
                 { text: "Suite", index: "suite", width: 150 },
                 
             ],
             // This data source is rendered into the Grid columns defined above
             source: null
         };

         // Create the grid in a container element
         this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#details-gridTestSuites"), options);

     }
     public show() {
         $("#details-testSuites").css("display", "block");
         $("#details-title").text("Associated test suites");
     }
     public hide() {
         $("#details-testSuites").css("display", "none");
     }

     public masterIdChanged(id: string)
     {
         var pane = this;
         $("#details-title").text("Associated test suites for #" + id);
         $("#details-testCase").text(id);

         TreeViewDataService.getTestSuitesForTestCase(parseInt(id)).then(function (data) {
             pane._grid.setDataSource(data.map(function (i) { return { id: i.id, suite: i.name, plan: i.plan.name, suiteType: i.suiteType}; }));
         });
     }
 }

 class testPlanPane implements IPaneRefresh {
     private _cbo: CtrlCombos.Combo;
     private _testPlans;
     private _view: DetailsView;

     public initialize(view: DetailsView) {
     
         this._view = view;
        var tpp = this;

        this._cbo = Controls.create(CtrlCombos.Combo, $("#details-cboTestPlan"), {
            mode: "drop",
            allowEdit: false,
        });

        TreeViewDataService.getTestPlans().then(function (data) {
            tpp._testPlans = data[0].children;
            
            tpp._cbo.setSource(tpp._testPlans.map(function (i) {
                return i.text;
            }));            
        });

        var treeOptionsTestPlan = {
            width: 400,
            height: "100%",
            nodes: null
        };

        var treeviewTestPlan = Controls.create(TreeView.TreeView, $("#details-treeviewTestPlan"), treeOptionsTestPlan);

        treeviewTestPlan.onItemClick = function (node, nodeElement, e) {
        };

        $("#details-cboTestPlan").change(function () {
            tpp._view.StartLoading(true, "Fetching test plan " + tpp._cbo.getSelectedIndex());
            var tp = tpp._testPlans[tpp._cbo.getSelectedIndex()];
            TreeViewDataService.getTestPlanAndSuites(tp.id, tp.text).then(function (data) {

                tpp._view.DoneLoading();

                treeviewTestPlan.rootNode.clear();

                treeviewTestPlan.rootNode.addRange(data);
                treeviewTestPlan._draw();

                var gridTC = <Grids.Grid>Controls.Enhancement.getInstance(Grids.GridO, $("#grid-container"));

                $("li.node").droppable({
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
                $(".grid-row-normal").draggable({
                    revert: "invalid",
                    appendTo: document.body,
                    helper: "clone",
                    zIndex: 1000,
                    cursor: "move",
                    cursorAt: { top: -5, left: -5 },
                    //scope: TFS_Agile.DragDropScopes.ProductBacklog,
                    //start: this._draggableStart,
                    //stop: this._draggableStop,
                    //helper: this._draggableHelper,
                    //drag: this._draggableDrag,
                    refreshPositions: true
                });
            });
        });
       
        $(".ui-draggable").draggable({
            revert: true,
            appendTo: document.body,
            helper: "clone",
            zIndex: 1000,
            refreshPositions: true
        });
     } 

     public show() {
         $("#details-TestPlan").css("display", "block");
         $("#details-title").text("Test plans");
     }

     public hide() {
         $("#details-TestPlan").css("display", "none");
     }

     public masterIdChanged(id: string) {
        //Nothing 
     }
 }

class testResultsPane implements IPaneRefresh {
    private _grid;

    public initialize(view: DetailsView) {
        var options = {
            height: "1000px", // Explicit height is required for a Grid control
            columns: [
                // text is the column header text. 
                // index is the key into the source object to find the data for this column
                // width is the width of the column, in pixels
                {
                    text: "Outcome", index: "Outcome", width: 100, getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var outcome = this.getColumnValue(dataIndex, column.index);
                        var d = $("<div class='grid-cell'/>").width(column.width || 100)
                        var dIcon = $("<div class='testpoint-outcome-shade icon'/>");
                        dIcon.addClass(TreeViewDataService.getIconFromTestOutcome(outcome));
                        d.append(dIcon);
                        var dTxt = $("<span />");
                        dTxt.text(outcome);
                        d.append(dTxt);
                        return d;
                    }
                },
 
                { text: "Configuration", index: "Configuration", width: 50 },
                { text: "Run by", index: "RunBy", width: 150 },
                { text: "Date ", index: "Date", width: 150 },
                { text: "Duration", index: "suite", width: 150 }
            ],
            // This data source is rendered into the Grid columns defined above
            source: null
        };

        // Create the grid in a container element
        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#details-gridTestResults"), options);
    }

    public hide() {
        $("#details-TestResults").css("display", "none");
    }

    public show() {
        $("#details-TestResults").css("display", "block");
        $("#details-title").text("Test results");
    }

    public masterIdChanged(id: string) {
        var pane = this;

        $("#details-title").text("Test results for #" + id);
        $("#details-testCase").text(id);

        TreeViewDataService.getTestResultsForTestCase(parseInt(id)).then(function (data) {
            var ds = data.map(function (i) { return { id: i.id, Outcome: i.outcome, Configuration: i.configuration.name, RunBy: (i.runBy == null ? "" : i.runBy.displayName), Date: i.completedDate }; });
            pane._grid.setDataSource(ds);
        });
    }
}
    