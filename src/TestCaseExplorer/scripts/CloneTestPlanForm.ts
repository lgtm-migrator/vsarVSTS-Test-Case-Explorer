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

        $("#testPlanInfo").text("Clone test plan '" + testPlanName + "'.");
        $("#targetTestPlan").val(testPlanName + " - Clone");

        var p1 = TreeViewDataService.getNodes("Area path", null);
        var p2 = TreeViewDataService.getNodes("Iteration path", null);
        Q.all([p1, p2]).then(categories => {
            that.createAreasCombo(that, categories[0]);
            that.createIterationsCombo(that, categories[1]);

            //TreeViewDataService.getProjects().then(p => {
            //    that.createProjectsCombo(that, p);
            //});
        });
    }

    public attachFormChanged(dialogStateCallback) {
        var testPlanName: string = $("#targetTestPlan").val();
        var isValid = (testPlanName.length > 0);
        dialogStateCallback(isValid);
    }

    private createProjectsCombo(that: CloneTestPlanForm, nodes) {
        var container = $("#targetProject");

        var treeOptions: Combos.IComboOptions = {
            source: nodes,
            change: function () {
                that._areaPath = this.getText();
            }
        };

        var combo = Controls.create(Combos.Combo, container, treeOptions);
        //combo.setSelectedIndex(0);
        combo.setText(VSS.getWebContext().project.name);
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

        var combo = Controls.create(Combos.Combo, container, treeOptions);
        combo.setSelectedIndex(0);
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

        var combo = Controls.create(Combos.Combo, container, treeOptions);
        combo.setSelectedIndex(0);
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