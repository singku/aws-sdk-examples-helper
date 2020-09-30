'use strict';

// Declare app level module which depends on views, and components
// angular.module('myApp', [
//   'ngRoute',
//   'myApp.view1',
//   'myApp.view2',
//   'myApp.version'
// ]).
// config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
//   $locationProvider.hashPrefix('!');
//
//   $routeProvider.otherwise({redirectTo: '/view1'});
// }]);


var app = angular.module('myApp', []);

app.controller('mainCtrl', function($scope, $http, utils) {
    $scope.hideSetUpWizard = true;
    $scope.hideCreateLogic = true;
    $scope.hideDocument = false;

    // var fs = require("fs");
    // var files = fs.readdirSync('view1');

    $scope.supportedService = ["dynamodb", "ec2", "s3", "sqs"];
    $scope.supportedLanguage = ["CPP", "Java", "Python"];
    $scope.supportedTemplate = function(language) {
        return {
            "CPP": ["Empty Project", "ListBuckets"],
            "Java": ["Empty Project", "ListBuckets"],
            "Python": ["Empty Project", "ListBuckets"]
        }[language];
    };

    $scope.createProject = function() {
        $scope.hideCreateLogic = true;
        $scope.hideSetUpWizard = false;
    };

    $scope.create = function() {
        $scope.hideSetUpWizard = true;
        $http.get("http://localhost:8080/?action=createProject&languageName=" + $scope.languageName +
            "&projectName=" + $scope.projectName +
            "&serviceName=" + $scope.serviceName +
            "&templateName=" + $scope.templateName
        )
            .then(function(response) {
                // console.log("finished");
                $scope.listFiles();
            })
    };

    $scope.showFile = function(fileName) {
        $http.get("http://localhost:8080/?action=showFile&fileName=" + fileName)
            .then(function(response) {
                // console.log(JSON.stringify(response.data));
                $scope.code = response.data;
            })
    };

    $scope.listFiles = function() {
        $http.get("http://localhost:8080/?action=listFiles")
            .then(function(response) {
                $scope.files = response.data;
            });
    };

    $scope.deleteFile = function(fileName) {
        $http.get("http://localhost:8080/?action=deleteFile&fileName=" + fileName)
            .then(function(response) {
                // console.log("finished");
                $scope.listFiles();
            })
    };

    $scope.getLineNumber = function($event) {
        // $scope.lineNo = $event.target.value.substr(0, $event.target.selectionStart).split('\n').length;
        $scope.position = $event.target.value.substr(0, $event.target.selectionStart).length;
    };

    $scope.insertLogic = function() {
        $scope.hideSetUpWizard = true;
        $scope.hideCreateLogic = false;
        $http.get("http://localhost:8080/?action=getOperation&serviceName=" + $scope.serviceName)
            .then(function(response) {
                // console.log(response.data);
                $scope.allOperation = response.data;
            });
    }

    $scope.findOperation = function(keywords) {

        var keywordList = keywords.split(' ');

        var operationSearchDict = $scope.allOperation;

        var operationKeywordDict = [];

        var operation;
        for (operation in operationSearchDict) {
            operationKeywordDict[operation] = 0;
            for (const i in keywordList) {
                if (operationSearchDict[operation].toLowerCase().indexOf(keywordList[i].toLowerCase()) != -1) {
                    operationKeywordDict[operation] += 1;
                }
            }
        }

        var operationList = Object.keys(operationKeywordDict).map(function(key) {
            return [key, operationKeywordDict[key]];
        });

        operationList.sort(function(first, second) {
            return second[1] - first[1];
        });

        var operationLi = [];
        for (var i = 0; i < operationList.length; i++) {
            operationLi.push(operationList[i][0]);
        }

        $scope.operationList = operationLi;
    };

    $scope.selectOperation = function(operation) {
        // console.log(operation);
        $scope.operationName = operation;
        $scope.hideCreateLogic = true;
        $http.get("http://localhost:8080/?action=getTemplate&serviceName=" + $scope.serviceName +
            "&operationName=" + operation)
            .then(function(response) {
                var requestTemplate = response.data;
                var sourceCodeList = $scope.code.split('\n');
                requestTemplate = "//@LogicTemplate\n" +
                    JSON.stringify(requestTemplate, null, 2) +
                    "\n//@LogicTemplate\n";

                $scope.code = $scope.code.substr(0, $scope.position) +
                    requestTemplate +
                    $scope.code.substr($scope.position);
            });
    };

    $scope.showDocument = function(operation) {
        $scope.operationDocument = $scope.allOperation[operation];
    };

    $scope.convert2Cpp = function() {
        console.log("miao");
        var template = $scope.code.match(/\/\/@LogicTemplate(.|\n)*\/\/@LogicTemplate/i);
        var requestDescription = template[0].substr(16, template[0].length-32);
        $http.get("http://localhost:8080/?action=getSourceCode" +
            "&serviceName=" + $scope.serviceName +
            "&operationName=" + $scope.operationName +
            "&requestDescription=" + requestDescription)
            .then(function(response) {
                $scope.code = response.data;
            });
    };

    $scope.listFiles();

});

app.service("utils", function() {
    this.print = function() {
        return "miao";
    }
});

// var doc = angular.element(document.querySelector('#doc'));
// doc.contentEditable = true;
// doc.focus();

// var doc = document.getElementById("doc");
// doc.contentEditable = true;
// doc.focus();
// console.log(doc.innerHTML);

