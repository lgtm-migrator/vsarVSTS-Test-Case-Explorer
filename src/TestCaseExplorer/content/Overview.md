The **Test Case Explorer** extension gives you features to manage your test cases better. The more test cases you have in your project the more challenging it can be to select the right tests to run. This extension helps you manage your test cases better, including features to help you:

* **Find test cases** - pivot test cases by different dimensions such as area path, iteration path, priority, state and test plan.
* **Filter test cases:**
	* Tests not associated with any requirements.
	* Tests with requirements linking.
	* Tests not present in any suites (orphaned).
	* Tests present in multiple suites.
* **Structure test cases** - assign test cases to any pivot by using drag-and-drop.
*	 **Test case management** - create and edit test cases.  
* **Analyze the usage** of a test case:
	* Test Suites - view in which test suites a test case is used.
	* Test Results - view the test results for a test case.
	* Requirements - view the associated requirements for a test case.

##How to use 
In order to test the extension you will need some test plans and test cases. Run some tests so you have at least a couple of test cases with test results.
 
* **Browsing test cases**
	* Use the left-hand pivot pane to find test cases
	* Pivot by area. Select an area and the test cases for that area is shown. Toggle the "show child items" and all test cases at and under the selected area are shown.
	* Pivot by iteration. Select an iteration and the test cases for that iteration is shown. Toggle the "show child items" and all test cases at and under the selected iteration are shown.
	* Pivot by priority. Select a priority and the test cases with that state is shown. Select the "Priotiy" node and all test cases for any priority is listed.
	* Pivot by state. Select a state and the test cases with that state is shown. Select the "State" node and all test cases for any state is listed.
	* Pivot by test suites. Select a test plan and look at the list of test cases on the root level of the test plan. Toggle the show child items and the list will show all test cases in all suites for the test plan.
* **Managing test cases**
	* Double-click on a test case in the grid to view and edit the test case.
	* Add a new test case using the "new" button in the toolbar.
	* Filter test cases using the filter pivot in the toolbar.
* **View test results for a test case**
	* Toggle the details pane at the right-side if it's not visible.
	* Select "test results" pane.
	* Select a test case and the test result for the test case is shown.
* **View test suites for a test case**
	* (NOTE: this does currently not work, see issues below)
	* Toggle the details pane at the right-side if it's not visible.
	* Select "test suites" pane.
	* Select a test case and the test suite where the test case is used is shown.
* **Mapping a test case to a Test suite**
	* Toggle the details pane at the right-side if it's not visible.
	* Select "test plan" pane.
	* Select a test case and drag it to the test suite in the details pane to add the test case to that suite.

##Learn more about this extension
To learn more about developing an extension for Visual Studio Online, see the overview of extensions.
