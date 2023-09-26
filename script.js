class TimeEntriesConverter {
    constructor() {

    }

    timeEntriesFromFormValues() {
        return tyme.timeEntries(
            formValue.startDate,
            formValue.endDate,
            formValue.taskIDs,
            null,
            formValue.onlyUnbilled ? 0 : null,
            formValue.includeNonBillable ? null : true,
            formValue.teamMemberID
        ).filter(function (timeEntry) {
            return parseFloat(timeEntry.sum) > 0;
        })
    }

    formatDate(dateString, timeOnly) {
        let locale = 'de-DE';
        if (timeOnly) {
            return (new Date(dateString)).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'});
        } else {
            return (new Date(dateString)).toLocaleDateString(locale);
        }
    }

    generatePreview() {
        utils.log("========= Export Preview =========");
        const data = this.timeEntriesFromFormValues();
        var str = '';
        str += '# Jira Export\n';

        str += '|' + utils.localize('timesheet.date');
        str += '|' + utils.localize('timesheet.start');
        str += '|' + utils.localize('timesheet.end');
        str += '|' + utils.localize('timesheet.duration');
        str += '|' + utils.localize('timesheet.description');
        str += '|' + utils.localize('timesheet.note');
        str += '|\n';
        str += '|-|-|-|-|-|-|\n';

        data.forEach((entry) => {
            str += '|' + this.formatDate(entry.start, false);
            str += '|' + this.formatDate(entry.start, true);
            str += '|' + this.formatDate(entry.end, true);
            str += '|' + entry.duration;
            str += '|' + entry.task;
            str += '|' + entry.note.replace(/\n/g, '<br/>');
            str += '|\n';
        });

        return utils.markdownToHTML(str);
    }
}

class JiraExportResolver {
    constructor(apiKey, jiraUrl, jiraUsername, timeEntriesConverter) {
        this.apiKey = apiKey;
        this.jiraUrl = jiraUrl;
        this.jiraUsername = jiraUsername;
        this.timeEntriesConverter = timeEntriesConverter;
        this.auth = 'Basic ' + utils.base64Encode(this.jiraUsername + ":" + this.apiKey);
    }

    formatDate(dateString) {
        let date = new Date(dateString);

        let year = date.getUTCFullYear();

        let month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        let day = date.getUTCDate().toString().padStart(2, '0');
        let hours = date.getUTCHours().toString().padStart(2, '0');
        let minutes = date.getUTCMinutes().toString().padStart(2, '0');
        let seconds = date.getUTCSeconds().toString().padStart(2, '0');
        let milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');

        // Constructing the offset string
        let offset = dateString.substring(dateString.length - 6); // Extracting '+02:00' from the input string

        let formatted = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+0000`;
        utils.log(formatted);
        return formatted;
    }

    export() {
        const data = this.timeEntriesConverter.timeEntriesFromFormValues();
        data.forEach((entry) => {
            const task = entry.task;
            // get the first word until the first comma to identify the issue
            const issue = task.split(',')[0].split(' ')[0];
            const url = this.jiraUrl + '/issue/' + issue + '/worklog';

            let payload =
                {
                    "started": "" + this.formatDate(entry.start) + "",
                    "timeSpentSeconds": entry.duration * 60
                }
            
            if (entry.note !== null && entry.note !== undefined && entry.note.length > 0) {
                payload = {
                    "comment": {
                        "content": [
                          {
                            "content": [
                              {
                                "text": "" + entry.note + "",
                                "type": "text"
                              }
                            ],
                            "type": "paragraph"
                          }
                        ],
                        "type": "doc",
                        "version": 1
                      },
                    "started": "" + this.formatDate(entry.start) + "",
                    "timeSpentSeconds": entry.duration * 60
                }
            }

            utils.log(JSON.stringify(payload));

            const response = utils.request(
                url, 
                'POST', 
                {
                    'Authorization': this.auth,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                }, 
                payload
            );

            const statusCode = response['statusCode'];

            if (statusCode === 201) {            
                if (formValue.markAsBilled) {
                    tyme.setBillingState([entry.id], 1);
                }
            } else {
                utils.log(JSON.stringify(response));
                tyme.showAlert('Jira API Error', JSON.stringify(response));
            }
        });

        tyme.showAlert('Jira Export', 'Export finished with ' + data.length + ' entries');
    }
}

const timeEntriesConverter = new TimeEntriesConverter();
const jiraExportResolver = new JiraExportResolver(formValue.apiKey, formValue.jiraUrl, formValue.jiraUsername, timeEntriesConverter);