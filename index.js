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

        const baseUrl = `${hostname}:${port}:/execute`;
        console.log(`baseUrl: '${baseUrl}'`);
        const updateRepoEndpoint = baseUrl + "/VersionControl/update";
        const createDeploymentTaskEndpoint = baseUrl + "/VersionControlDeployment/create";
        const getDeploymentStatusEndpoint = baseUrl + "/VersionControlDeployment/retrieve";

        let updateRes = await axios.get(updateRepoEndpoint, {
            params: {
                repository_root,
                branch,
            },
            headers: {"Authorization": `cpanel ${cpanel_username}:${cpanel_token}`}
        });
        console.log(`updateRes: ${JSON.stringify(updateRes, null, 2)}`);
        updateRes = updateRes.data;
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
        console.log(`startDeployRes: ${startDeployRes}`);
        startDeployRes = startDeployRes.data;
        if (startDeployRes.errors !== null) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error("Failed to start deployment task: " + JSON.stringify(startDeployRes.errors, null, 2));
        }
        const taskId = startDeployRes.task_id;
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
            if (taskData.succeeded != null) {
                console.log(`task succeeded at ${taskData.succeeded}`);
                break;
            }
            if (taskData.failed != null) {
                console.log(`task failed at ${taskData.failed}`);
                console.log(`errors: ${pollRes.errors}`);
                console.log(`messages: ${pollRes.messages}`);
                // noinspection ExceptionCaughtLocallyJS
                throw new Error(`Task failed to deploy. errors: ${pollRes.errors}`);
            }
            //not failed nor success - wait
            console.log(`task ${taskId} still running. taskData: ${taskData}`);
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
