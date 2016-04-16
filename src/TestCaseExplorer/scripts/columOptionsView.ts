import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Dialogs = require("VSS/Controls/Dialogs");
import WorkItemContracts = require("TFS/WorkItemTracking/Contracts");
import WorkItemClient = require("TFS/WorkItemTracking/RestClient");
import TestClient = require("TFS/TestManagement/RestClient");
import TestContracts = require("TFS/TestManagement/Contracts");
import DetailsToggle = require("scripts/DetailsToggle");
import Navigation = require("VSS/Controls/Navigation");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import CoreUtils = require("VSS/Utils/Core");
import CtrlCombos = require("VSS/Controls/Combos");
import WorkItemServices = require("TFS/WorkItemTracking/Services");


import TestCaseDataService = require("scripts/TestCaseDataService");
import Common = require("scripts/Common");

export interface TestCaseViewSelectedCallback { (value: string): void }

export class ColumnOptionsView {

    public _avaibleFields: WorkItemContracts.WorkItemFieldReference[];
    public _selectedColumns: Common.ICustomColumnDef[];
    private gridAvailbleFields: Grids.Grid;
    private gridSelectedColumns: Grids.Grid;
    public Init() {
        var view = this;
        var witClient = WorkItemClient.getClient();
        var ctx = VSS.getWebContext();

        witClient.getWorkItemType(ctx.project.id, "Test Case").then(
            wit=> {
                view._avaibleFields = wit.fields.map(f=> { return f.field; });
                view.setupAvailbleGrid()
            },
            err=> {
            }
        );
        this.setupSelectedColumnsGrid();
        this.setupMoveButtons();
        this.setupSortButtons();
    }

    private setupAvailbleGrid() {
        var gridOptions: Grids.IGridOptions = {
            width: "500px",
            source: this._avaibleFields,
            columns: [
                { text: "Field", width: 200, index: "field" },
            ]
        };

        this.gridAvailbleFields = Controls.create(Grids.Grid, $('grid-column-source'), gridOptions);
    }


    private setupSelectedColumnsGrid() {
        var gridOptions: Grids.IGridOptions = {
            width: "500px",
            source: this._selectedColumns,
            columns: [
                { text: "Field", width: 200, index: "field" },
            ]
        };

        this.gridSelectedColumns = Controls.create(Grids.Grid, $('grid-selected-columns'), gridOptions);

        
    }

    private setupMoveButtons() {
        var view = this;
        $('cmdAdd').click(e => {
            var i = view.gridAvailbleFields.getSelectedDataIndex();
            var f = view._avaibleFields[i];
            var c: Common.ICustomColumnDef = { field: f.referenceName , name: f.name, width: 75 };
            view._selectedColumns.push(c);
            view._avaibleFields.slice(i);

        });
        
        $('cmdRemove').click(e => {
            var i = view.gridSelectedColumns.getSelectedDataIndex();
            var c = view.gridSelectedColumns[i];
            var f= { referenceName: c.field, name: c.name, url:""};
            view._avaibleFields.push(f);
            view._selectedColumns.slice(i);
        });
        
    }

    private setupSortButtons() {
        var view = this;
        $('cmdUp').click(e => {

        });

        $('cmdDown').click(e => {

        });

    }
}

export function Register() {
    var registrationForm = (function () {
        var callbacks = [];

        function inputChanged() {
            // Execute registered callbacks
            for (var i = 0; i < callbacks.length; i++) {
                callbacks[i](isValid());
            }
        }

        function isValid() {
            // Check whether form is valid or not
            return true; //!!(name.value) && !!(dateOfBirth.value) && !!(email.value);
        }

        function getFormData() {
            // Get form values
            return {
                //name: name.value,
                //dateOfBirth: dateOfBirth.value,
                //email: email.value
            };
        }

        //var name = document.getElementById("inpName");
        //var dateOfBirth = document.getElementById("inpDob");
        //var email = document.getElementById("inpEmail");

        //name.addEventListener("change", inputChanged);
        //dateOfBirth.addEventListener("change", inputChanged);
        //email.addEventListener("change", inputChanged);

        return {
            isFormValid: function () {
                return isValid();
            },
            getFormData: function () {
                return getFormData();
            },
            attachFormChanged: function (cb) {
                callbacks.push(cb);
            }
        };
    })();

    // Register form object to be used accross this extension
    VSS.register("columnOptionsForm", registrationForm);

}

