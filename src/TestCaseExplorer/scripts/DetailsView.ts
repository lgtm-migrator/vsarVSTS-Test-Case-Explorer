/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import CommonControls = require("VSS/Controls/Common");

import TreeViewDataService = require("scripts/TreeViewDataService");


export interface TreeviewSelectedCallback { (type: string, value: string): void }


export class DetailsView {
    public initialize() {
        var cboSources = ["Test plan", "Test results", "requirement",];

        var cbo = Controls.create(CommonControls.Combo , $("#details-Cbo-container"), {
            source: cboSources
        });

//        cbo.set(cboSources[0]);

        var treeOptions = {
            width: 400,
            height: "100%",
            nodes: null
        };

        var treeview = Controls.create(TreeView.TreeView, $("#details-treeview-container"), treeOptions);
        treeview.onItemClick = function (node, nodeElement, e) {
        };

        
        $("#details-Cbo-container").change(function () {
            switch (cbo.getText()) {
                case "Test plan":
                    ShowPanel("TestPlan");
                    break;

                case "Test result":
                    ShowPanel("TestResult");
                    break;
            }

        });
    }

    
}

 function ShowPanel(panel: string) {

     $("#details-TestPlan").css("display", "none");
     $("#details-TestResults").css("display", "none");

     switch (panel) {
         case "TestPlan":
             initTestPlan();
             break;
         case "TestResults":
             initTestResults();
             break;
     }
}
 function initTestPlan() {
     $("#details-TestPlan").css("display", "block");
     TreeViewDataService.getTestPlans().then(function (data) {

         var cbo = Controls.create(CommonControls.Combo, $("#details-cboTestPlan"), {
             mode: "drop",
            allowEdit: false, 
            source: data[0].children.map(function (i) { return { id: i.id, text: i.text };})
         });

         var treeOptionsTestPlan= {
             width: 400,
             height: "100%",
             nodes: null
         };

         var treeviewTestPlan = Controls.create(TreeView.TreeView, $("#details-treeviewTestPlan"), treeOptionsTestPlan);
         treeviewTestPlan.onItemClick = function (node, nodeElement, e) {
         };


         $("#details-cboTestPlan").change(function () {
             TreeViewDataService.getTestPlanaAndSuites(parseInt(cbo.getId()) , cbo.getText() ).then(function (data) {
                 treeviewTestPlan.rootNode.clear();
           
                 treeviewTestPlan.rootNode.addRange(data);

                 treeviewTestPlan._draw();
             });
             
         });
     });


 }

function initTestResults() {
    $("details-TestResults").css("display", "block");

}