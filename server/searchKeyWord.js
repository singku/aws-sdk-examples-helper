if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

var fs = require("fs");

function extractAllC2jModel(directory) {
    var files = fs.readdirSync(directory);
    files.forEach(function(fileName, index) {
        extractC2jModel(directory, fileName);
    });
}

function extractC2jModel(directory, fileName) {
    var match = fileName.match(/\d{4}-\d{2}-\d{2}/);
    if (match) {
        var serviceName = fileName.substring(0, match.index - 1);
        var c2jFile = fs.readFileSync(directory + "/" +fileName);
        c2jModel[serviceName] = JSON.parse(c2jFile);

        c2jOperationSearchDict[serviceName] = {};
        for (var operation in c2jModel[serviceName].operations) {
            c2jOperationSearchDict[serviceName][operation] =  c2jModel[serviceName].operations[operation].name + ": "
                + c2jModel[serviceName].operations[operation].documentation
        }
    }
}

function findOperation(keywordList, serviceName) {

    var operationSearchDict = c2jOperationSearchDict[serviceName]

    var operationKeywordDict = [];

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

    return operationList;
}

function createShapeTree(serviceName, operationName) {
    var root = {};
    root.name = serviceModel.operations[operationName].name;
    root.type = "operation";
    root.service = serviceName;

    if (serviceModel.operations[operationName].hasOwnProperty("input")) {
        root.input = {};
        addShapeNode(root.input, serviceModel.operations[operationName].input.shape);
    }

    if (serviceModel.operations[operationName].hasOwnProperty("output")) {
        root.output = {};
        addShapeNode(root.output, serviceModel.operations[operationName].output.shape);
    }

    return root;
}

function addShapeNode(shapeNode, shapeName) {
    shapeNode.name = shapeName;
    var shape = serviceModel.shapes[shapeName];
    shapeNode.type = shape.type;

    switch (shapeNode.type) {
        case "structure":
            shapeNode.required = [];
            if (shape.hasOwnProperty("required")) {
                shapeNode.required = shape.required;
            }

            shapeNode.members = {};
            for (const childShapeName in shape.members) {
                shapeNode.members[childShapeName] = {};
                addShapeNode(shapeNode.members[childShapeName], shape.members[childShapeName].shape);
            }
            break;
        case "map":
            shapeNode.key = {};
            addShapeNode(shapeNode.key, shape.key.shape);
            shapeNode.value = {};
            addShapeNode(shapeNode.value, shape.value.shape);
            break;
        case "string":
            if (shape.hasOwnProperty("enum")) {
                shapeNode.enum = shape.enum;
            }
            break;
        case "boolean":
            break;
        case "blob":
            break;
        case "integer":
            break;
        case "long":
            break;
        case "timestamp":
            break;
        default:
            console.log("Unhandled type when create shape tree: " + shapeNode.type);
    }

}

function createTemplate(operationRoot) {
    var template = {};
    template.service = operationRoot.service;
    template.operation = operationRoot.name;

    // Template input
    if (operationRoot.hasOwnProperty("input")) {
        template.input = {};
        template.input[operationRoot.input.name] = addTemplateNode(operationRoot.input);
    }

    // Template output
    if (operationRoot.hasOwnProperty("output")) {
        template.output = {};
        template.output[operationRoot.output.name] = addTemplateNode(operationRoot.output);
    }

    return template;
}

function addTemplateNode(shapeNode) {
    switch (shapeNode.type) {
        case "structure":
            var templateNode = {};
            for (const childShapeName in shapeNode.members) {
                templateNode[shapeNode.members[childShapeName].name] = addTemplateNode(shapeNode.members[childShapeName]);
            }
            return templateNode;
            // break;
        case "map":
            var templateNode = {};
            templateNode[shapeNode.key.name] = addTemplateNode(shapeNode.key);
            templateNode[shapeNode.value.name] = addTemplateNode((shapeNode.value));
            return templateNode;
            // break;
        case "string":
            return null;
            // break;
        case "boolean":
            return null;
            // break;
        case "blob":
            return null;
            // break;
        case "integer":
            return null;
            // break;
        case "long":
            return null;
            // break;
        default:
            console.log("Unhandled type when create template: " + shapeNode.type);
            return null;
    }
}

function generateSnippet(serviceName, language, operation, requestDescription) {

    var variable = {};
    var service2Namespace = {
        "dynamodb": "DynamoDB",
        "ec2": "EC2",
        "s3": "S3",
        "sqs": "SQS"
    };
    // var serviceName = template.service;

    function firstLetter2LowerCase(str) {
        return str[0].toLowerCase() + str.slice(1);
    }

    function firstLetter2UpperCase(str) {
        return str[0].toUpperCase() + str.slice(1);
    }

    function assambleAll(statementList) {
        var snippet = "";
        for (i in statementList) {
            if (Array.isArray(statementList[i])) {
                for (j in statementList[i]) {
                    snippet += statementList[i][j];
                    snippet += "\n";
                }
            } else {
                snippet += statementList[i];
                snippet += "\n";
            }
            snippet += "\n";
        }
        return snippet;
    }

    function addParameters(paraName, subOperation, subRequest) {
        var subRequestSnippet = "";
        var variableName = "";
        var primitive = false;

        var shapeName = subOperation.name;
        var shape = serviceModel.shapes[shapeName];

        switch (shape.type) {
            case "structure":
                primitive = false;
                variableName = firstLetter2LowerCase(paraName); // TODO: avoid conflict.
                subRequestSnippet += "Aws::{0}::model::{1} {2};\n".format(
                    service2Namespace[serviceName], shapeName, variableName
                );
                for (subParaName in subOperation.members) {
                    var subShapeName = subOperation.members[subParaName].name;
                    var metadata = addParameters(subParaName, subOperation.members[subParaName], subRequest[subShapeName]);
                    if (metadata.primitive) {
                        if (metadata.snippet != null) {
                            subRequestSnippet += "{0}.set{1}({2});\n".format(
                                variableName, subParaName, metadata.snippet
                            );
                        }
                    } else {
                        subRequestSnippet += "{0}.set{1}({2});\n".format(
                            variableName, subParaName, metadata.variableName
                        );
                        subRequestSnippet += metadata.snippet;
                    }
                }
                break;
            // case "map":
            //     break;
            case "string":
                primitive = true;
                subRequestSnippet = subRequest;
                break;
            case "boolean":
                primitive = true;
                subRequestSnippet = subRequest;
                break;
            case "blob":
                primitive = true;
                subRequestSnippet = subRequest;
                break;
            case "integer":
                primitive = true;
                subRequestSnippet = subRequest;
                break;
            case "long":
                primitive = true;
                subRequestSnippet = subRequest;
                break;
            default:
                console.log("Unhandled type when add parameters: " + shape.type);
        }

        return {
            'primitive': primitive,
            'variableName': variableName,
            'snippet': subRequestSnippet
        };
    }

    // Aws::S3::Model::DeleteBucketRequest bucket_request;
    // bucket_request.SetBucket(bucket_name);

    // Init sdk
    var sdkStatement = [];
    sdkStatement[0] = "int main(int argc, char** argv)";
    sdkStatement[1] = "{";
    sdkStatement[2] = "Aws::SDKOptions options;";
    sdkStatement[3] = "Aws::InitAPI(options);";

    // Init configuration
    var region = "us-east-1";
    variable["config"] = "config";
    variable["client"] = serviceName + "Client";

    var configStatement = [];
    configStatement[0] = "Aws::Client::ClientConfiguration {0};".format(variable.config);
    configStatement[1] = "{0}.region = {1};".format(variable.config, region);

    // Init client
    var clientStatement = "Aws::{0}::{0}Client {1}({2});".format(
        service2Namespace[serviceName], variable.client, variable.config);

    // Init request
    console.assert(Object.keys(requestDescription).length == 1);
    var requestName = Object.keys(requestDescription)[0];
    var metadata = addParameters(requestName, operation.input, requestDescription[requestName]);
    var requestStatement = [];
    requestStatement[0] = metadata.snippet;

    // End sdk
    var endStatement = [];
    endStatement[0] = "Aws::ShutdownAPI(options);";
    endStatement[1] = "}";

    // Init Header
    var headerStatement = [];
    headerStatement[0] = "#include <aws/core/Aws.h>;";
    headerStatement[1] = "#include <aws/{0}/{1}Client.h>;".format(serviceName, service2Namespace[serviceName]);
    headerStatement[2] = "#include <aws/{0}/model/{1}.h>".format(serviceName, requestName);

    // Make request
    variable["outcome"] = "{0}Outcome".format(requestName);
    requestStatement[1] = "auto {0} = {1}.{2}({3});".format(
        variable.outcome, variable.client, operation.name, metadata.variableName
    );

    return assambleAll([headerStatement, sdkStatement, configStatement, clientStatement, requestStatement, endStatement]);
}

var c2jModel = {};
var c2jOperationSearchDict = {};
extractAllC2jModel("api-description");
// var operationNameList = findOperation(["Bucket", "List"], "s3");
// console.log(operationNameList);

var serviceModel = c2jModel.s3;
// var operationRoot = createShapeTree("s3", "CopyObject");
// var template = createTemplate(operationRoot);
// console.log(JSON.stringify(operationRoot, null, 2));
// console.log(JSON.stringify(template, null, 2));

// var requestDescription = {
//     "DeleteObjectRequest": {
//         "BucketName": "bucketName",
//         "ObjectKey": "keyName",
//         "MFA": null,
//         "ObjectVersionId": null,
//         "RequestPayer": null
//     }
// };

// var snippet = generateSnippet("s3", "cpp", operationRoot, requestDescription);
// console.log(snippet);

var http = require('http');
var url = require('url');

var walkSync = function(dir, filelist) {
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
        if (!file.startsWith('.')) {
            if (fs.statSync(dir + file).isDirectory()) {
                filelist = walkSync(dir + file + '/', filelist);
            }
            else {
                filelist.push(dir + file);
            }
        }
    });
    return filelist;
};

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
    // res.writeHead(200, {'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*'});
    var q = url.parse(req.url, true).query;
    var txt = "";
    switch (q.action) {
        case "createProject":
            var wizard = require("./wizard");
            // console.log(q.templateName);
            wizard.createProject(q.languageName, q.projectName, q.serviceName, q.templateName);
            break;
        case "editFile":
            break;
        case "listFiles":
            txt = walkSync("workspace/", []);
            break;
        case "showFile":
            txt = fs.readFileSync(q.fileName, 'utf8');
            break;
        case "deleteFile":
            fs.unlinkSync(q.fileName);
            break;
        case "getOperation":
            // extractAllC2jModel("api-description");
            txt = c2jOperationSearchDict[q.serviceName];
            break;
        case "getTemplate":
            serviceModel = c2jModel[q.serviceName];
            var operationRoot = createShapeTree(q.serviceName, q.operationName);
            txt = createTemplate(operationRoot).input;
            break;
        case "getSourceCode":
            var operationRoot = createShapeTree(q.serviceName, q.operationName);
            console.log(q.requestDescription);
            txt = generateSnippet(q.serviceName, "cpp", operationRoot, JSON.parse(q.requestDescription));
            break;
    }
    res.end(JSON.stringify(txt));
}).listen(8080);



