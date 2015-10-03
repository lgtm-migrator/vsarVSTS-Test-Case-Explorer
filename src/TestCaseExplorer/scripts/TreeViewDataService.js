/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
define(["require", "exports", "TFS/WorkItemTracking/Contracts", "TFS/TestManagement/RestClient", "TFS/WorkItemTracking/RestClient", "VSS/Controls/TreeView"], function (require, exports, Contracts, TestClient, WITClient, TreeView) {
    function getNodes(param) {
        switch (param) {
            case "Area path":
                return getStructure(Contracts.TreeStructureGroup.Areas);
                break;
            case "Iteration path":
                return getStructure(Contracts.TreeStructureGroup.Iterations);
                break;
            case "Priority":
                return getPrioriy();
                break;
            case "State":
                return getStates();
                break;
            case "Test plan":
                return getTestPlansWithSuite();
                break;
        }
    }
    exports.getNodes = getNodes;
    function getIconFromSuiteType(suiteType) {
        var icon = "";
        switch (suiteType) {
            case "StaticTestSuite":
                icon = "icon-tfs-tcm-static-suite";
                break;
            case "RequirementTestSuite":
                icon = "icon-tfs-tcm-requirement-based-suite";
                break;
            case "DynamicTestSuite":
                icon = "icon-tfs-tcm-query-based-suite";
                break;
        }
        return icon;
    }
    exports.getIconFromSuiteType = getIconFromSuiteType;
    function getIconFromTestOutcome(outcome) {
        var icon = "";
        switch (outcome) {
            case "NotApplicable":
                icon = "icon-tfs-tcm-not-applicable";
                break;
            case "Blocked":
                icon = "icon-tfs-tcm-block-test";
                break;
            case "Passed":
                icon = "icon-tfs-build-status-succeeded";
                break;
            case "Failed":
                icon = "icon-tfs-build-status-failed";
                break;
            case "None":
                icon = "icon-tfs-tcm-block-test";
                break;
            case "DynamicTestSuite":
                icon = "icon-tfs-build-status-succeeded";
                break;
        }
        return icon;
    }
    exports.getIconFromTestOutcome = getIconFromTestOutcome;
    function getTestPlansWithSuite() {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getPlans(VSS.getWebContext().project.name).then(function (data) {
            var tRoot = convertToTreeNodes([{ name: "Test plans", children: [] }], "");
            var i = 0;
            var noPlans = data.length;
            data.forEach(function (t) {
                getTestPlanAndSuites(t.id, t.name).then(function (n) {
                    tRoot[0].addRange(n);
                    i++;
                    if (i >= noPlans) {
                        tRoot[0].expanded = true;
                        deferred.resolve(tRoot);
                    }
                });
            });
        });
        return deferred.promise();
    }
    exports.getTestPlansWithSuite = getTestPlansWithSuite;
    function getTestPlans() {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getPlans(VSS.getWebContext().project.name).then(function (data) {
            var tRoot = convertToTreeNodes([{ name: "Test plans", children: [] }], "");
            data.forEach(function (t) {
                tRoot[0].addRange(convertToTreeNodes([{ name: t.name, id: t.id, children: [] }], ""));
            });
            tRoot[0].expanded = true;
            deferred.resolve(tRoot);
        });
        return deferred.promise();
    }
    exports.getTestPlans = getTestPlans;
    function getTestSuitesForTestCase(testCaseId) {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getSuitesByTestCaseId(testCaseId).then(function (data) {
            deferred.resolve(data);
        });
        return deferred.promise();
    }
    exports.getTestSuitesForTestCase = getTestSuitesForTestCase;
    function getTestResultsForTestCase(testCaseId) {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        var q = { query: "Select * from TestResult  WHERE TestCaseId=" + testCaseId };
        tstClient.getTestResultsByQuery(q, VSS.getWebContext().project.name, true).then(function (data) {
            deferred.resolve(data);
        });
        return deferred.promise();
    }
    exports.getTestResultsForTestCase = getTestResultsForTestCase;
    function getTestPlanAndSuites(planId, testPlanName) {
        // Get an instance of the client
        var deferred = $.Deferred();
        var tstClient = TestClient.getClient();
        tstClient.getTestSuitesForPlan(VSS.getWebContext().project.name, planId).then(function (data) {
            var tRoot = BuildTestSuiteTree(data.filter(function (i) { return i.parent == null; }), null, data);
            deferred.resolve([tRoot]);
        });
        return deferred.promise();
    }
    exports.getTestPlanAndSuites = getTestPlanAndSuites;
    function BuildTestSuiteTree(tsList, parentNode, allTS) {
        var returnNode = null;
        tsList.forEach(function (t) {
            var node = new TreeView.TreeNode(t.name);
            node.id = t.id;
            node.type = t.suiteType;
            node.expanded = true;
            node.droppable = true;
            node.icon = getIconFromSuiteType(t.suiteType);
            node.config = { name: t.name, suiteId: t.id, testPlanId: parseInt(t.plan.id) };
            BuildTestSuiteTree(allTS.filter(function (i) { return i.parent != null && i.parent.id == t.id; }), node, allTS);
            if (parentNode != null) {
                parentNode.children.push(node);
            }
            else {
                returnNode = node;
            }
        });
        return returnNode;
    }
    function getStructure(structure) {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        client.getRootNodes(VSS.getWebContext().project.name, 11).then(function (data) {
            deferred.resolve(convertToTreeNodes([data[structure]], ""));
        });
        return deferred.promise();
    }
    function getStates() {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        var project = VSS.getWebContext().project.name;
        client.getWorkItemTypeCategory(project, "Microsoft.TestCaseCategory").then(function (witCat) {
            client.getWorkItemType(project, witCat.defaultWorkItemType.name).then(function (data) {
                var d = data;
                var t = { name: "States", children: [] };
                for (var s in d.transitions) {
                    if (s != "") {
                        t.children.push({ name: s, config: s });
                    }
                }
                var t2 = [];
                t2.push(t);
                deferred.resolve(convertToTreeNodes(t2, ""));
            });
        });
        return deferred.promise();
    }
    function getPrioriy() {
        var deferred = $.Deferred();
        var client = WITClient.getClient();
        client.getWorkItemType(VSS.getWebContext().project.name, "Test case").then(function (data) {
            var d = [{ name: "Priority", children: [{ name: "1", config: "1" }, { name: "2", config: "2" }, { name: "3", config: "3" }, { name: "4", config: "4" }] }];
            deferred.resolve(convertToTreeNodes(d, ""));
        });
        return deferred.promise();
    }
    // Converts the source to TreeNodes
    function convertToTreeNodes(items, path) {
        var a = [];
        items.sort(function (a, b) {
            if (a.name < b.name)
                return -1;
            if (a.name > b.name)
                return 1;
            return 0;
        }).forEach(function (item) {
            var itemPath = "";
            if (path == "") {
                itemPath = item.name;
            }
            else {
                itemPath = path + "\\" + item.name;
            }
            var node = new TreeView.TreeNode(item.name);
            node.icon = item.icon;
            node.id = item.id;
            node.config = { name: item.name, path: itemPath };
            node.expanded = item.expanded;
            if (item.children && item.children.length > 0) {
                node.addRange(convertToTreeNodes(item.children, itemPath));
            }
            a.push(node);
        });
        return a;
    }
});
//# sourceMappingURL=TreeViewDataService.js.map