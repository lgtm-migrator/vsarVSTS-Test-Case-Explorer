/// <reference path='../typings/tsd.d.ts' />

import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import TreeView = require("VSS/Controls/TreeView");
import TreeViewDataService = require("scripts/TreeViewDataService");
import Q = require("q");

export interface IFormInput {
    suites: string[];
    newTestPlanName: string;
    areaPath: string;
    iterationPath: string;
    cloneRequirements: boolean;
}

export class CloneTestPlanForm {
    private _areaPath: string;

    public init(testPlanName) {
        var that = this;

        $("#sourceTestPlan").val(testPlanName);

        var p1 = TreeViewDataService.getNodes("Area path", null);
        var p2 = TreeViewDataService.getNodes("Iteration path", null);

        Q.all([p1, p2]).then(categories => {
            that.createSuitesCombo();
            that.createAreasCombo(that, categories[0]);
            that.createIterationsCombo(categories[1]);
        });
    }

    private createSuitesCombo() {
        var container = $("#sourceTestSuites");
        
        var treeOptions: Combos.IComboOptions = {
            type: TreeView.ComboTreeMultivalueBehaviorName,
            source: [
                {
                    text: "wit",
                    children: [{ text: "platform", children: [{ text: "client" }, { text: "server" }] }, { text: "te" }]
                }, {
                    text: "vc"
                }, {
                    text: "webaccess", children: [{ text: "platform" }, { text: "agile" }, { text: "requirements" }]
                }, {
                    text: "etm"
                }, {
                    text: "build"
                }
            ]
        };

        Controls.create(Combos.Combo, container, treeOptions);
    }

    private createAreasCombo(that: CloneTestPlanForm, nodes) {
        var container = $("#targetAreaPath");

        var treeOptions: Combos.IComboOptions = {
            type: TreeView.ComboTreeBehaviorName, 
            source: nodes,
            change: function () {
                that._areaPath = this.getText();
            }
    };

        Controls.create(Combos.Combo, container, treeOptions);
    }

    private createIterationsCombo(nodes) {
        var container = $("#targetIterationPath");

        var treeOptions: Combos.IComboOptions = {
            type: TreeView.ComboTreeBehaviorName,
            source: nodes
        };

        Controls.create(Combos.Combo, container, treeOptions);
    }

    public getFormData(): IFormInput {
        return {
            suites: [],
            areaPath: this._areaPath, 
            iterationPath: $("#targetIterationPath").text(),
            newTestPlanName: $("#targetTestPlan").val(),
            cloneRequirements: $("#cloneRequirements").prop("checked")
        };
    }
}

VSS.register("clone-testplan-form", context => {
    return new CloneTestPlanForm();
});

VSS.notifyLoadSucceeded();