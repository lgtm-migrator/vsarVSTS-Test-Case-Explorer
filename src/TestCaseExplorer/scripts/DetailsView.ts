/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import Grids = require("VSS/Controls/Grids");
import CommonControls = require("VSS/Controls/Common");

import TreeViewDataService = require("scripts/TreeViewDataService");


interface PaneRefresh {
    initialize(): void,
    hide(): void,
    masterIdChanged(id: string): void
}


export class DetailsView {

    public _selectedPane: PaneRefresh;

    public initialize() {
        var cboSources = ["Test plan", "Test suites", "Test results", "requirement",];

        var cbo = Controls.create(CommonControls.Combo , $("#details-Cbo-container"), {
            source: cboSources
        });



        var treeOptions = {
            width: 400,
            height: "100%",
            nodes: null
        };

        var treeview = Controls.create(TreeView.TreeView, $("#details-treeview-container"), treeOptions);
        treeview.onItemClick = function (node, nodeElement, e) {
        };

        var dv = this;
        
        $("#details-Cbo-container").change(function () {
            switch (cbo.getText()) {
                case "Test plan":
                    dv.ShowPanel("TestPlan");
                    break;
                case "Test suites":
                    dv.ShowPanel("TestSuites");
                    break;
                case "Test result":
                    dv.ShowPanel("TestResult");
                    break;
            }

        });
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
         var treeOptionsTestPlan = {
             width: 400,
             height: "100%",
             nodes: null
         };

         var options = {
             height: "1000px", // Explicit height is required for a Grid control
             columns: [
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
             pane._grid.setDataSource(data.map(function (i) { return { id: i.id, suite: i.name, plan: i.plan.name }; }));
         });
     }
 }


 class testPlanPane implements PaneRefresh{

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
         //NOthing
     }
 }

class testResultsPane implements PaneRefresh {

    public initialize() {
        $("details-TestResults").css("display", "block");

      
    }
    public hide() {
        $("#details-TestResults").css("display", "none");
    }

    public masterIdChanged(id: string) {
        //NOthing
    }
}
    