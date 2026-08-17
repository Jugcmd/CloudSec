targetScope = 'resourceGroup'

@description('Deployment location for all resources.')
param location string = resourceGroup().location

@description('Prefix used for generated resource names. Use lowercase letters and numbers only.')
@minLength(3)
@maxLength(12)
param namePrefix string

@description('Administrator login name for Azure SQL Server.')
param sqlAdminLogin string

@description('Administrator password for Azure SQL Server.')
@secure()
param sqlAdminPassword string

@description('JWT issuer value consumed by the API.')
param jwtIssuer string = 'CloudSec.Api'

@description('JWT audience value consumed by the API.')
param jwtAudience string = 'CloudSec.Frontend'

@description('JWT signing key consumed by the API. Use a long random value.')
@secure()
param jwtSigningKey string

@description('Deployment environment name used for tags and governance.')
param environment string = 'dev'

@description('Owner tag used to help identify the application team.')
param owner string = 'CloudSec'

@description('Cost centre tag used for governance and reporting.')
param costCenter string = 'CloudEngineering'

var normalizedPrefix = toLower(namePrefix)
var appServicePlanName = '${normalizedPrefix}-asp'
var apiAppName = '${normalizedPrefix}-api'
var sqlServerName = '${normalizedPrefix}-sql-${uniqueString(resourceGroup().id)}'
var sqlDatabaseName = 'cloudsecdb'
var storageName = toLower('${take(normalizedPrefix, 10)}st${take(uniqueString(resourceGroup().id), 10)}')
var appInsightsName = '${normalizedPrefix}-appi'
var logAnalyticsName = '${normalizedPrefix}-law'
var keyVaultName = toLower('${take(normalizedPrefix, 8)}kv${take(uniqueString(resourceGroup().id), 8)}')

var resourceTags = {
  Application: 'CloudSec'
  Environment: environment
  Owner: owner
  CostCenter: costCenter
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: resourceTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  tags: resourceTags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: resourceTags
  sku: {
    name: 'S1'
    tier: 'Standard'
    size: 'S1'
    capacity: 1
  }
  properties: {
    reserved: true
  }
}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: sqlServerName
  location: location
  tags: resourceTags
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    version: '12.0'
    publicNetworkAccess: 'Enabled'
  }
}

resource sqlServerAllowAzure 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  tags: resourceTags
  sku: {
    name: 'Basic'
    tier: 'Basic'
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 2147483648
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  tags: resourceTags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

var frontendOriginRaw = storageAccount.properties.primaryEndpoints.web
var frontendOrigin = endsWith(frontendOriginRaw, '/')
  ? substring(frontendOriginRaw, 0, length(frontendOriginRaw) - 1)
  : frontendOriginRaw

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: resourceTags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enabledForDeployment: false
    enabledForTemplateDeployment: true
    enableRbacAuthorization: false
    publicNetworkAccess: 'Enabled'
    accessPolicies: []
  }
}

resource jwtSigningKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'JwtSigningKey'
  properties: {
    value: jwtSigningKey
  }
}

resource sqlConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'SqlConnectionString'
  properties: {
    value: 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Initial Catalog=${sqlDatabaseName};Persist Security Info=False;User ID=${sqlAdminLogin};Password=${sqlAdminPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'
  }
}

resource apiApp 'Microsoft.Web/sites@2023-12-01' = {
  name: apiAppName
  location: location
  tags: resourceTags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|10.0'
      alwaysOn: true
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      healthCheckPath: '/healthz'
      appSettings: [
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: 'Production'
        }
        {
          name: 'DatabaseProvider'
          value: 'SqlServer'
        }
        {
          name: 'ConnectionStrings__DefaultConnection'
          value: '@Microsoft.KeyVault(SecretUri=${sqlConnectionStringSecret.properties.secretUriWithVersion})'
        }
        {
          name: 'Jwt__Issuer'
          value: jwtIssuer
        }
        {
          name: 'Jwt__Audience'
          value: jwtAudience
        }
        {
          name: 'Jwt__SigningKey'
          value: '@Microsoft.KeyVault(SecretUri=${jwtSigningKeySecret.properties.secretUriWithVersion})'
        }
        {
          name: 'Cors__AllowedOrigins__0'
          value: frontendOrigin
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
      ]
    }
  }
}

resource apiAppSecretAccess 'Microsoft.KeyVault/vaults/accessPolicies@2023-07-01' = {
  parent: keyVault
  name: 'add'
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: apiApp.identity.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

resource appServiceScaleProfile 'Microsoft.Insights/autoscaleSettings@2022-10-01' = {
  name: '${appServicePlanName}-autoscale'
  location: location
  tags: resourceTags
  properties: {
    targetResourceUri: appServicePlan.id
    enabled: true
    profiles: [
      {
        name: 'defaultProfile'
        capacity: {
          minimum: '1'
          maximum: '3'
          default: '1'
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 30
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
        ]
      }
    ]
  }
}

resource highCpuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${appServicePlanName}-cpu-high'
  location: 'global'
  tags: resourceTags
  properties: {
    description: 'Alert when the App Service plan CPU exceeds 70 percent.'
    severity: 2
    enabled: true
    scopes: [
      appServicePlan.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighCpu'
          metricName: 'CpuPercentage'
          metricNamespace: 'Microsoft.Web/serverfarms'
          operator: 'GreaterThan'
          threshold: 70
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
  }
}

output apiAppName string = apiApp.name
output apiUrl string = 'https://${apiApp.properties.defaultHostName}'
output apiHealthUrl string = 'https://${apiApp.properties.defaultHostName}/healthz'
output sqlServerName string = sqlServer.name
output sqlDatabaseName string = sqlDatabase.name
output frontendStorageAccountName string = storageAccount.name
output frontendUrl string = frontendOrigin
output appInsightsName string = appInsights.name
output keyVaultName string = keyVault.name
