/// <reference path='../typings/tsd.d.ts' />

import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import TreeView = require("VSS/Controls/TreeView");
import TreeViewDataService = require("scripts/TreeViewDataService");
import Q = require("q");

export interface IFormInput {
    newTestPlanName: string;
    areaPath: string;
    iterationPath: string;
    cloneRequirements: boolean;
}

export class CloneTestPlanForm {

    private _areaPath: string;
    private _iterationPath: string;

    public init(testPlanName) {
        var that = this;

        $("#sourceTestPlan").val(testPlanName);

        var p1 = TreeViewDataService.getNodes("Area path");
        var p2 = TreeViewDataService.getNodes("Iteration path");

        Q.all([p1, p2]).then(categories => {
            that.createAreasCombo(that, categories[0]);
            that.createIterationsCombo(that, categories[1]);
        });
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

    private createIterationsCombo(that: CloneTestPlanForm, nodes) {
        var container = $("#targetIterationPath");

        var treeOptions: Combos.IComboOptions = {
            type: TreeView.ComboTreeBehaviorName,
            source: nodes,
            change: function () {
                that._iterationPath = this.getText();
            }
        };

        Controls.create(Combos.Combo, container, treeOptions);
    }

    public getFormData(): IFormInput {
        return {
            areaPath: this._areaPath, 
            iterationPath: this._iterationPath,
            newTestPlanName: $("#targetTestPlan").val(),
            cloneRequirements: $("#cloneRequirements").prop("checked")
        };
    }
}

VSS.register("clone-testplan-form", context => {
    return new CloneTestPlanForm();
});

VSS.notifyLoadSucceeded();