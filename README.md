# Jira Exporter

This plugin exports data from [Tyme](https://www.tyme-app.com) to  [jira](https://jira.atlassian.com). 

The plugin uses the [Jira API](https://developer.atlassian.com/server/jira/platform/rest-apis/) to post the data.

## Install

Please generate your own API key to access Jira data.

The url for the api must be in the form of https://your-project.atlassian.net/rest/api/3

The username is needed for authorization. 

## Convention

The issue id is taken from the description of the task.

