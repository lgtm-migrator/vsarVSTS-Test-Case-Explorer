/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import TestClient = require("TFS/TestManagement/RestClient");
import TestContracts = require("TFS/TestManagement/Contracts");
import DetailsToggle = require("scripts/DetailsToggle");

export interface TestCaseViewSelectedCallback { (value: string): void }

export class TestCaseView {

    private _paneToggler: DetailsToggle.DetailsPaneToggler;
    private _grid: Grids.Grid;

    public RefreshGrid(pivot: string, value: string) {
        switch (pivot) {
            case "Area path":
                this.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Area, value).then(result => {
                    this._grid.setDataSource(result);
                });
                break;
            case "Iteration path":
                this.getTestCasesByProjectStructure(WorkItemContracts.TreeNodeStructureType.Iteration, value).then(result => {
                    this._grid.setDataSource(result);
                });
                break;
            case "Priority":
                //this.getTestCasesByPriority(value).then(result => {
                //    this._grid.setDataSource(result);
                //});
                break;
            case "State":
                //this.getTestCasesByState(value).then(result => {
                //    this._grid.setDataSource(result);
                //});
                break;
            case "Test plan":
                this.getTestCasesByTestPlan(50, 51).then(result => {
                    this._grid.setDataSource(result);
                });
                break;
            case "Team":
                //this.getTestCasesByTeam("Area", value).then(result => {
                //    this._grid.setDataSource(result);
                //});
                break;
        }
    }

    public toggle() {
    }

    private getTestCases(workItemIds: number[]): IPromise<any> {
        var deferred = $.Deferred<any[]>();
        var workItemClient = WorkItemClient.getClient();

        workItemClient.getWorkItems(workItemIds, ["System.Id", "System.Title", "System.State", "System.AssignedTo"]).then(result => {
            var dataSource = [];
            result.forEach(workItem => {
                dataSource.push({ id: workItem.id, title: workItem.fields["System.Title"], state: workItem.fields["System.State"], assigned_to: workItem.fields["System.State"], priority: "1", automation_status: "Planned" });
            });
            deferred.resolve(dataSource);
        });

        return deferred.promise();
    }

    private getTestCasesByProjectStructure(structureType: WorkItemContracts.TreeNodeStructureType, path: string): IPromise<any> {
        var deferred = $.Deferred<any[]>();
        var workItemClient = WorkItemClient.getClient();

        workItemClient.queryByWiql({ query: "TODO" }, VSS.getWebContext().project.name).then(result => {
            var dataSource = [];
            //result.forEach(tc => {
            //    dataSource.push({ id: tc.testCase.id, title: "111Main page of Phone should...", state: "Active", assigned_to: "Kapil Rata", priority: "1", automation_status: "Planned" });
            //});
            deferred.resolve(dataSource);
        });

        return deferred.promise();
    }

    private getTestCasesByTestPlan(planId: number, suiteId: number): IPromise<any> {
        var deferred = $.Deferred<any[]>();
        var testClient = TestClient.getClient();

        testClient.getTestCases(VSS.getWebContext().project.name, planId, suiteId).then(result => {
            var ids = result.map(function (item) {
                return item.testCase.id;
            }).map(Number);

            this.getTestCases(ids).then(testCases => {
                deferred.resolve(testCases);
            });
        });

        return deferred.promise();
    }

    public initialize(paneToggler: DetailsToggle.DetailsPaneToggler, selectCallBack: TestCaseViewSelectedCallback) {

        this._paneToggler = paneToggler;

        var menuItems: Menus.IMenuItemSpec[] = [
            { id: "file", text: "New", icon: "icon-add-small" },
            { separator: true },
            { id: "clone", text: "Clone", noIcon: true },
            { separator: true },
            { id: "column_options", text: "Column Options", noIcon: true },
            { id: "toggle", showText: false, icon: "icon-tfs-tcm-associated-pane-toggle", cssClass: "right-align", text: "Show/hide" }
        ];

        var tcv = this;

        var menubarOptions = {
            items: menuItems,
            executeAction: function (args) {
                var command = args.get_commandName();
                switch (command) {
                    case "toggle":
                        paneToggler.toggleDetailsPane()
                        menubar.updateCommandStates([{ id: command, toggled: tcv._paneToggler._isTestCaseDetailsPaneOn() }]);
                        break;
                    default:
                        alert("Unhandled action: " + command);
                        break;
                }
            }
        };

        var menubar = Controls.create<Menus.MenuBar, any>(Menus.MenuBar, $("#menu-container"), menubarOptions);

        var dataSource = [];
        dataSource.push({ id: "586", title: "User should be able to...", state: "Design", assigned_to: "Kapil Rata", priority: "1", automation_status: "Planned" });
        dataSource.push({ id: "552", title: "Main page of Phone should...", state: "Active", assigned_to: "Kapil Rata", priority: "1", automation_status: "Planned" });

        //var result = this.getTestCases(50, 51);
        //result.then(testCases => {
        //    testCases.forEach(tc => {
        //        dataSource.push({ id: tc.testCase.id, title: "111Main page of Phone should...", state: "Active", assigned_to: "Kapil Rata", priority: "1", automation_status: "Planned" });
        //    });
        //});

        var client = WorkItemClient.getClient();
        //client.queryByWiql()
        //client.queryByWiql(
        var queryText = "SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo] FROM WorkItemLinks WHERE ([Source].[System.TeamProject] = @project  AND  [Source].[System.WorkItemType] = 'Test Case'  AND  [Source].[System.State] <> '') And ([System.Links.LinkType] <> '') And ([Target].[System.WorkItemType] IN GROUP 'Requirement Category') ORDER BY [System.Id] mode(DoesNotContain)";
        //client.getWorkItems(
        client.queryByWiql({ query: queryText }, "FeaturesInc").then(result => {
            var x = result.workItems;
        });

        //var x = client.queryByWiql( {""}, "");
        var c = TestClient.getClient();
        //c.getTestCases(VSS.getWebContext().project.name, 1, 1).then(result => {
        
        //});
        //c.getTestCases(
        //client.queryByWiql(x, "FeaturesInc");

        var options = {
            height: "1000px", // Explicit height is required for a Grid control
            columns: [
                // text is the column header text. 
                // index is the key into the source object to find the data for this column
                // width is the width of the column, in pixels
                { text: "Id", index: "id", width: 50 },
                { text: "Title", index: "title", width: 150 },
                { text: "State", index: "state", width: 50 },
                { text: "Assigned To", index: "assigned_to", width: 75 },
                { text: "Priority", index: "priority", width: 50 },
                { text: "Automation status", index: "automation_status", width: 75 }
            ],
            // This data source is rendered into the Grid columns defined above
            source: dataSource,
            draggable: true,
            droppable: true

        };

        // Create the grid in a container element
        this._grid = Controls.create<Grids.Grid, Grids.IGridOptions>(Grids.Grid, $("#grid-container"), options);

        $("#grid-container").bind(Grids.GridO.EVENT_SELECTED_INDEX_CHANGED, function (eventData) {
            var s = this._grid.getRowData(this._grid.getSelectedDataIndex()).id;
            selectCallBack(s);
        });

        this._grid.enableDragDrop();

    }
}

