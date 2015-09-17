/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import Grids = require("VSS/Controls/Grids");
import CommonControls = require("VSS/Controls/Common");
import Menus = require("VSS/Controls/Menus");

import TreeViewDataService = require("scripts/TreeViewDataService");



interface PaneRefresh {
    initialize(): void,
    hide(): void,
    masterIdChanged(id: string): void
}


export class DetailsView {

    public _selectedPane: PaneRefresh;

    public initialize() {
        //var cboSources = ["Test plan", "Test suites", "Test results", "requirement",];

        //var cbo = Controls.create(CommonControls.Combo , $("#details-Cbo-container"), {
        //    source: cboSources
        //});

        var menuItems: Menus.IMenuItemSpec[] = [
           
            {
                id: "root", text: "Select Pane ", childItems: [
                    { id: "TestPlan", text: "Test plan"},
                    { id: "TestSuites", text: "Test suites", icon: "icon-commented-file" },
                    { id: "TestResults", text: "Test results" }

                ]
            },
            {
                id: "rootPanePlace", text: "Select Position ", childItems: [
                    { id: "right", text: "Right", },
                    { id: "bottom", text: "Bottom"}
                ]
            },
        ];

        var dv = this;
        var menubar: Menus.MenuBar = null;

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                dv.ShowPanel(command);
                
                    menuItems[0].text = command;
                    
                menubar.updateItems(menuItems);
            }

        };

         menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#details-Cbo-container"), menubarOptions);
         var defaultMenuItem= menuItems[0].childItems[0];
         menuItems[0].text = menuItems[0].childItems[0].text;
         menubar.updateItems(menuItems);

         dv.ShowPanel(defaultMenuItem.id);
         

        
        
        //$("#details-Cbo-container").change(function () {
        //    switch (cbo.getText()) {
        //        case "Test plan":
        //            dv.ShowPanel("TestPlan");
        //            break;
        //        case "Test suites":
        //            dv.ShowPanel("TestSuites");
        //            break;
        //        case "Test result":
        //            dv.ShowPanel("TestResult");
        //            break;
        //    }

        //});
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

        var pane: PaneRefresh;

        switch (panel) {
            case "TestPlan":
                pane= new testPlanPane();
                break;
            case "TestResults":
                pane = new testResultsPane();
                break;
            case "TestSuites":
                pane = new partOfTestSuitesPane();
                break;
        }

        this._selectedPane = pane;
        this._selectedPane.initialize();
    }

    
}


 class partOfTestSuitesPane implements PaneRefresh
    {

     private _grid;

     public initialize() {
         $("#details-testSuites").css("display", "block");

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

     public hide() {
         $("#details-testSuites").css("display", "none");
     }

     public masterIdChanged(id: string)
     {
         var pane = this;

         $("#details-testCase").text(id);

         TreeViewDataService.getTestSuitesForTestCase(parseInt(id)).then(function (data) {
             pane._grid.setDataSource(data.map(function (i) { return { id: i.id, suite: i.name, plan: i.plan.name, suiteType: i.suiteType}; }));
         });
     }
 }


 class testPlanPane implements PaneRefresh {

     public initialize() {
         $("#details-TestPlan").css("display", "block");
         TreeViewDataService.getTestPlans().then(function (data) {

             var cbo = Controls.create(CommonControls.Combo, $("#details-cboTestPlan"), {
                 mode: "drop",
                 allowEdit: false,
                 source: data[0].children.map(function (i) { return { id: i.id, text: i.text }; })
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
                 TreeViewDataService.getTestPlanaAndSuites(parseInt(cbo.getId()), cbo.getText()).then(function (data) {
                     treeviewTestPlan.rootNode.clear();

                     treeviewTestPlan.rootNode.addRange(data);

                     treeviewTestPlan._draw();
                 });

             });
         });
     }
     public hide() {
         $("#details-TestPlan").css("display", "none");
     }

     public masterIdChanged(id: string) {

        //Nothing 
     }
 }

class testResultsPane implements PaneRefresh {
    private _grid;

    public initialize() {
        $("#details-TestResults").css("display", "block");

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

    public masterIdChanged(id: string) {
        var pane = this;

        $("#details-testCase").text(id);

        TreeViewDataService.getTestResultsForTestCase(parseInt(id)).then(function (data) {
            var ds = data.map(function (i) { return { id: i.id, Outcome: i.outcome, Configuration: i.configuration.name, RunBy: (i.runBy == null ? "" : i.runBy.displayName), Date: i.completedDate }; });
            pane._grid.setDataSource(ds);
        });
    }
}
    