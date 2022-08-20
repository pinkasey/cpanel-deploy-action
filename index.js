const core = require('@actions/core');
const axios = require('axios');

const main = async () => {

    const timeStart = new Date();
    try {
        const maxWaitSeconds = 60 * 5;
        const hostname = core.getInput('hostname', {required: true});
        const port = core.getInput('cPanelApiPort', {required: true});
        const repository_root = core.getInput('repository_root', {required: true});
        const branch = core.getInput('branch', {required: true});
        const cpanel_token = core.getInput('cpanel_token', {required: true});
        const cpanel_username = core.getInput('cpanel_username', {required: true});

        const baseUrl = `${hostname}:${port}/execute`;
        console.log(`baseUrl: '${baseUrl}'`);
        const updateRepoEndpoint = baseUrl + "/VersionControl/update";
        const createDeploymentTaskEndpoint = baseUrl + "/VersionControlDeployment/create";
        const getDeploymentStatusEndpoint = baseUrl + "/VersionControlDeployment/retrieve";

        let updateRes = await axios.get(updateRepoEndpoint, {
            port: port,
            params: {
                repository_root,
                branch,
            },
            headers: {"Authorization": `cpanel ${cpanel_username}:${cpanel_token}`}
        });
        updateRes = updateRes.data;
        console.log(`updateRes: ${JSON.stringify(updateRes, null, 2)}`);
        if (updateRes.errors !== null) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error(updateRes.errors);
        }

        let startDeployRes = await axios.get(createDeploymentTaskEndpoint, {
            params: {
                repository_root,
            },
            headers: {"Authorization": `cpanel ${cpanel_username}:${cpanel_token}`}
        });
        startDeployRes = startDeployRes.data;
        console.log(`startDeployRes: ${JSON.stringify(startDeployRes, null, 2)}`);
        if (startDeployRes.errors !== null) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error("Failed to start deployment task: " + JSON.stringify(startDeployRes.errors, null, 2));
        }
        const taskId = startDeployRes.data.task_id;
        if (!taskId) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error("Failed to start deployment task - task_id = " + taskId);
        }

        for (let i=0; i<maxWaitSeconds; i++) {
            console.log(`polling iteration ${i}`);
            let pollRes = await axios.get(getDeploymentStatusEndpoint, {
                headers: {"Authorization": `cpanel ${cpanel_username}:${cpanel_token}`}
            });
            pollRes = pollRes.data;
            if (pollRes.errors != null){

            }
            const taskData = pollRes.data.filter( info => info.task_id === taskId )[0];
            if (taskData.timestamps.succeeded != null) {
                console.log(`task succeeded at ${taskData.timestamps.succeeded}`);
                break;
            }
            if (taskData.timestamps.failed != null) {
                console.log(`task failed at ${taskData.timestamps.failed}`);
                console.log(`errors: ${pollRes.errors}`);
                console.log(`messages: ${pollRes.messages}`);
                // noinspection ExceptionCaughtLocallyJS
                throw new Error(`Task failed to deploy. errors: ${pollRes.errors}`);
            }
            //not failed nor success - wait
            console.log(`task ${taskId} still running. taskData: ${JSON.stringify(taskData, null, 2)}`);
            await new Promise(r => setTimeout(r, 1000));
        }
        
        const duration = new Date() - timeStart;
        core.setOutput("duration", duration);
        console.log(`deployment duration: ${duration}`);
    } catch (error) {
        const duration = new Date() - timeStart;
        const errorBody = error.response?.data;
        console.log(`failed deployment duration: ${duration}`);
        console.log(`errorBody: ${errorBody}`);
        core.setOutput("duration", duration);

        core.setFailed(error.message + (errorBody == null ? "" : `\n${errorBody}` ));
    }
};

main();
