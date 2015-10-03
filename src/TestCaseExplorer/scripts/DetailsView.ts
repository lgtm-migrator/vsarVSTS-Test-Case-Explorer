/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/jqueryui.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import Grids = require("VSS/Controls/Grids");
import CommonControls = require("VSS/Controls/Common");
import Menus = require("VSS/Controls/Menus");

import Toggler = require("scripts/DetailsToggle");
import TreeViewDataService = require("scripts/TreeViewDataService");



interface IPaneRefresh {
    initialize(): void,
    hide(): void,
    show(): void;
    masterIdChanged(id: string): void
}


export class DetailsView {

    public _selectedPane: IPaneRefresh;
    private _PaneLst: IPaneRefresh[];

    public _toggler: Toggler.DetailsPaneToggler;

    public initialize(paneToggler: Toggler.DetailsPaneToggler) {
   
        this._PaneLst = [];
        this._toggler = paneToggler;



        var menuItemsPane: Menus.IMenuItemSpec[] = [

            {
                id: "root", text: "Select Pane ", childItems: [
                    { id: "TestPlan", text: "Test plan" },
                    { id: "TestSuites", text: "Test suites", icon: "icon-commented-file" },
                    { id: "TestResults", text: "Test results" }

                ]
            },
           
        ];

        var dv = this;
        var menubarPane: Menus.MenuBar = null;

        var menubarOptionsPane= {
            items: menuItemsPane,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {
                    default:
                        dv.ShowPanel(command);
                        menuItemsPane[0].text = args.get_commandSource()._item.text;
                        menubarPane.updateItems(menuItemsPane);
                        break;
                };
            }
        };
        menuItemsPane[0].text = menuItemsPane[0].childItems[0].text;
        menubarPane = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#details-filterPane-container"), menubarOptionsPane);


        var menuItemsPosition: Menus.IMenuItemSpec[] = [
            {
                id: "rootPanePlace", text: "Select Position ", childItems: [
                    { id: "right", text: "Right", },
                    { id: "bottom", text: "Bottom" }
                ]
            },
        ];
        
         var menubarPosition: Menus.MenuBar = null;

         var menubarOptionsPosition = {
             items: menuItemsPosition,
             executeAction: function (args) {
                 var command = args.get_commandName();
                 switch (command) {
                     case "right":
                     case "bottom":
                         dv._toggler.setPosition(command);
                         menuItemsPosition[0].text = args.get_commandSource()._item.text;
                         menubarPosition.updateItems(menuItemsPosition);
                         break;
                 };
             }
         };
         menuItemsPosition[0].text = menuItemsPosition[0].childItems[0].text;

         menubarPosition = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#details-filterPosition-container"), menubarOptionsPosition);


         dv.ShowPanel(menuItemsPane[0].childItems[0].id);
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
            pane.initialize();
            this._PaneLst[panel] = pane;
        } else {
            pane = this._PaneLst[panel];
        }

        this._selectedPane = pane;
        this._selectedPane.show();
    }

}


 class partOfTestSuitesPane implements IPaneRefresh
    {

     private _grid;

     public initialize() {
         
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
     private _cbo: CommonControls.Combo;
     private _testPlans;

     public initialize() {
     
        var tpp = this;

        this._cbo= Controls.create(CommonControls.Combo, $("#details-cboTestPlan"), {
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
        treeviewTestPlan.setDroppable(true);

        treeviewTestPlan.onItemClick = function (node, nodeElement, e) {
        };


        $("#details-cboTestPlan").change(function () {
            
            var tp = tpp._testPlans[tpp._cbo.getSelectedIndex()];
            TreeViewDataService.getTestPlanAndSuites(tp.id, tp.text).then(function (data) {
                treeviewTestPlan.rootNode.clear();

                treeviewTestPlan.rootNode.addRange(data);
                treeviewTestPlan._draw();
            });
        });

        $("#droppable").droppable({
            drop: function (event, ui) {
                alert("Dropped");
            }
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

    public initialize() {
      

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
    