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
    projectName: string;
    cloneRequirements: boolean;
}

export class CloneTestPlanForm  {

    private _projectName: string;
    private _areaPath: string;
    private _iterationPath: string; 
    private callbacks = [];
    private _areaCombo: Combos.Combo;
    private _iterationCombo: Combos.Combo;

    public init(testPlanName) {
        var that = this;

        $("#testPlanInfo").text("Clone test plan '" + testPlanName + "'.");
        $("#targetTestPlan").val(testPlanName + " - Clone");

        this._projectName = VSS.getWebContext().project.name;
        this._areaCombo = that.createAreasCombo(that);
        this._iterationCombo = that.createIterationsCombo(that);

        TreeViewDataService.getProjects().then(p => {
            that.createProjectsCombo(that, p);
            that.loadAreasIterations(that._projectName);
        });

        $("#targetTestPlan").change(e => {
            console.log("targetTestPlan EventFired");
            that.inputChanged();
        });
    }
    
    public inputChanged() {
        // Execute registered callbacks
        for (var i = 0; i < this.callbacks.length; i++) {
            this.callbacks[i](this.isFormValid());
        }
    }
 
    public attachFormChanged(cb) {
        this.callbacks.push(cb);
    }

    public isFormValid(): boolean {
        var testPlanName: string = $("#targetTestPlan").val();
        return (testPlanName.length > 0);
    }
    
    private loadAreasIterations(teamProject: string) {
        var that = this;
        var p1 = TreeViewDataService.getNodes("Area path", null, teamProject);
        var p2 = TreeViewDataService.getNodes("Iteration path", null, teamProject);

        this._areaCombo.setSource(null);
        that._areaCombo.setText("");
        this._iterationCombo.setSource(null);
        that._iterationCombo.setText("");
        that._areaPath = "";
        that._iterationPath = "";

        Q.all([p1, p2]).then(categories => {

            console.debug("loaded areas/iterations for " + teamProject);
            categories[0].forEach(p => { console.debug("  Area: " + p.text); });
            categories[1].forEach(p => { console.debug("  Iteration: " + p.text); });

            that._areaCombo.setSource(categories[0]);
            that._areaCombo.setSelectedIndex(0);
            that._iterationCombo.setSource(categories[1]);
            that._iterationCombo.setSelectedIndex(0);
            that._areaPath = teamProject;
            that._iterationPath = teamProject;
        });
    }

    private createProjectsCombo(that: CloneTestPlanForm, nodes) {
        var container = $("#targetProject");

        var treeOptions: Combos.IComboOptions = {
            source: nodes,
            change: function () {
                that._projectName = this.getText();
                that.loadAreasIterations(that._projectName);
            }
        };

        var combo = Controls.create(Combos.Combo, container, treeOptions);
        combo.setText(VSS.getWebContext().project.name);
    }

    private  createAreasCombo(that: CloneTestPlanForm): Combos.Combo  {
        var container = $("#targetAreaPath");

        var treeOptions: Combos.IComboOptions = {
            type: TreeView.ComboTreeBehaviorName,
            change: function () {
                that._areaPath = this.getText();
            }
        };

        var combo = Controls.create(Combos.Combo, container, treeOptions);
        return combo;
    }

    private createIterationsCombo(that: CloneTestPlanForm): Combos.Combo {
        var container = $("#targetIterationPath");

        var treeOptions: Combos.IComboOptions = {
            type: TreeView.ComboTreeBehaviorName,
            change: function () {
                that._iterationPath = this.getText();
            }
        };

        var combo = Controls.create(Combos.Combo, container, treeOptions);
        return combo;
    }

    public getFormData(): IFormInput {
        return {
            areaPath: this._areaPath, 
            iterationPath: this._iterationPath,
            newTestPlanName: $("#targetTestPlan").val(),
            projectName: this._projectName,
            cloneRequirements: $("#cloneRequirements").prop("checked")
        };
    }
}

VSS.register("clone-testplan-form", context => {
    return new CloneTestPlanForm();
});

VSS.notifyLoadSucceeded();