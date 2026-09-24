// תשתית מלאה של מערכת BugReports כקוד (Infrastructure as Code).
// פריסה: az deployment group create -g rg-bugtracker -f infra/main.bicep --parameters infra/main.parameters.json
//        --parameters sqlAdminPassword=<סיסמה> openAiApiKey=<מפתח> alertEmailAddress=<מייל>
// (הפרמטרים הרגישים לא נשמרים בקובץ - מועברים בזמן ה-deploy בלבד, ראה הסבר בשיחה)

targetScope = 'resourceGroup'

@description('אזור עיקרי לרוב המשאבים (App Service, SQL, App Insights)')
param location string = resourceGroup().location

@description('שם ה-App Service (Backend API)')
param appServiceName string = 'bugtracker-api-aharon'

@description('שם ה-App Service Plan')
param appServicePlanName string = 'ASP-rgbugtracker-8517'

@description('SKU של ה-App Service Plan')
param appServicePlanSku string = 'B1'

@description('שם שרת ה-SQL')
param sqlServerName string = 'sql-aharon-bugs-app'

@description('שם מסד הנתונים')
param sqlDatabaseName string = 'BugReportsDb'

@description('SKU של מסד הנתונים')
param sqlDatabaseSku string = 'Basic'

@description('שם משתמש מנהל ה-SQL')
param sqlAdminLogin string

@secure()
@description('סיסמת מנהל ה-SQL - להעביר בזמן deploy בלבד, לא לשמור בקובץ')
param sqlAdminPassword string

@description('שם ה-Static Web App')
param staticWebAppName string = 'bugtracker-web-aharon'

@description('אזור ה-Static Web App (מוגבל למספר אזורים נתמכים בלבד)')
param staticWebAppLocation string = 'centralus'

@description('שם משאב Application Insights')
param appInsightsName string = 'appi-bugtracker'

@description('שם ה-Log Analytics Workspace המקושר')
param logAnalyticsName string = 'law-bugtracker'

@description('שם ה-Action Group להתראות מייל')
param actionGroupName string = 'email-notifications'

@description('כתובת המייל שתקבל התראות')
param alertEmailAddress string

@secure()
@description('מפתח ה-API של OpenAI - להעביר בזמן deploy בלבד, לא לשמור בקובץ')
param openAiApiKey string

@description('מודל ה-OpenAI בשימוש')
param openAiModelId string = 'gpt-4o-mini'

// ==========================================
// Log Analytics Workspace
// ==========================================
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ==========================================
// Application Insights (workspace-based)
// ==========================================
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
  }
}

// ==========================================
// App Service Plan (Linux)
// ==========================================
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: appServicePlanSku
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// ==========================================
// App Service (Backend API)
// ==========================================
resource appService 'Microsoft.Web/sites@2022-09-01' = {
  name: appServiceName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|8.0'
      healthCheckPath: '/health'
      appSettings: [
        {
          name: 'ConnectionStrings__DefaultConnection'
          value: 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Database=${sqlDatabaseName};User ID=${sqlAdminLogin};Password=${sqlAdminPassword};Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;'
        }
        {
          name: 'OpenAI__ApiKey'
          value: openAiApiKey
        }
        {
          name: 'OpenAI__ModelId'
          value: openAiModelId
        }
        {
          name: 'ApplicationInsights__ConnectionString'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
    }
  }
}

// ==========================================
// SQL Server + Database
// ==========================================
resource sqlServer 'Microsoft.Sql/servers@2022-05-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    version: '12.0'
  }
}

resource sqlFirewallAllowAzure 'Microsoft.Sql/servers/firewallRules@2022-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAllWindowsAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  sku: {
    name: sqlDatabaseSku
  }
  properties: {
    maxSizeBytes: 2147483648
  }
}

// ==========================================
// Static Web App (Frontend)
// ==========================================
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: staticWebAppName
  location: staticWebAppLocation
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

// ==========================================
// Action Group - התראות מייל
// ==========================================
resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: actionGroupName
  location: 'global'
  properties: {
    groupShortName: 'email-alerts'
    enabled: true
    emailReceivers: [
      {
        name: 'email-alerts'
        emailAddress: alertEmailAddress
        useCommonAlertSchema: false
      }
    ]
  }
}

// ==========================================
// Metric Alert Rule - Health Check
// ==========================================
resource healthCheckAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'backend-health-check-alert'
  location: 'global'
  properties: {
    severity: 3
    enabled: true
    scopes: [
      appService.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          criterionType: 'StaticThresholdCriterion'
          name: 'HealthCheckStatusCriterion'
          metricName: 'HealthCheckStatus'
          operator: 'LessThan'
          threshold: 100
          timeAggregation: 'Average'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

output appServiceHostName string = appService.properties.defaultHostName
output staticWebAppHostName string = staticWebApp.properties.defaultHostname
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
