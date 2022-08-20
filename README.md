# cpanel-deploy-action
This actinos deploys a site to cPanel using the cPanel API,
by taking the following steps:
1. Tell cPanel to pull the branch
2. Tell cPanel to deploy the branch
3. Poll cPanel deployment status, until the deployment task is complete

To make use of this action, your site should have a valid `.cpanel.yml` file at its root.
More info about cPanel deployment can be found in the [official documentation](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-how-to-set-up-deployment/)


## Inputs

### `hostname`
**Required** hostname of cPanel installation, including protocol. for instance: https://hostname.example.com

### `cPanelApiPort`
Port of cPanel API. The default value is `2083` - don't change it unless you know what you're doing

### `cpanel_token`
cPanel API token, used for authorization. You should store this as a repository-secret.

### `cpanel_username`
cPanel username used for API calls. Must be the same username used to create the token. e.g: 'joe'

### `repository_root`
**Required** folder in which the repository is installed in the target cPanel account. must already exist. e.g: /home/your_account/repositories/your_repository

### `branch`
**Required** branch to deploy. e.g: 'main' or 'master', or any other branch. Default: `main`


#Outputs

### `duration`
Duration of deployment, in milliseconds


## Example usage
```
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to cPanel
        id: deploy
        uses: pinkasey/cpanel-deploy-action@v1.0.0
        with:
          hostname: 'https://hostname.example.com'
          repository_root: '/home/my_account/repositories/my_repository'
          branch: main
          cpanel_token: '${{ secrets.CPANEL_TOKEN }}'
      - name: echo deploy-duration
        run: echo "Deployment took ${{ steps.deploy.outputs.duration }} milliseconds"
```
