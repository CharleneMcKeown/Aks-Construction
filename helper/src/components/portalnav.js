
import React, { useState, useEffect } from 'react';
import { ThemeProvider, Toggle, TooltipHost, Pivot, PivotItem, Icon, Separator, Stack, Text } from '@fluentui/react';
import Presents from './presets'

import NetworkTab from './networkTab'
import AddonsTab from './addonsTab'
import ClusterTab, { VMs } from './clusterTab'
import DeployTab from './deployTab'
import AppsTab from './appsTab'

import { appInsights } from '../index.js'
import { initializeIcons } from '@fluentui/react/lib/Icons';
initializeIcons();


function useAITracking(componentName, key) {

  useEffect(() => {
    const start = new Date(), pagename = `${componentName}.${key}`
    appInsights.startTrackPage(pagename)
    return () => {
      console.log(`exit screen ${key} ${(new Date() - start) / 1000}`)
      appInsights.stopTrackPage(pagename,
        { 'Component Name': componentName, 'Navigation': key },
        { mounttime: (new Date() - start) / 1000 })
    };
  }, [componentName, key])

}

function Header({ entScale, setEntScale, featureFlag }) {
  return (
    <Stack horizontal tokens={{ childrenGap: 10 }}>
      <img src="aks.svg" alt="Kubernetes Service" style={{ width: "6%", height: "auto" }}></img>
      <Stack tokens={{ padding: 10 }}>
        <Text variant="xLarge">AKS Deploy helper</Text>
        <Text >Provide the requirements of your AKS deployment to generate the assets to create a full operational environment, incorporating best-practices guidance. For documentation, and CI/CD samples - please refer to our <a href="https://github.com/Azure/Aks-Construction" target="_blank" rel="noopener noreferrer">GitHub Repository</a></Text>
      </Stack>
      <Stack.Item tokens={{ padding: 10 }}>
        <Toggle
          label={
            <Text nowrap>
              Enterprise Scale{' '}
              <TooltipHost content="use if you are following Enterprise Scale">
                <Icon iconName="Info" aria-label="Info tooltip" />
              </TooltipHost>
            </Text>
          }
          onText="Yes"
          offText="No"
          checked={entScale}
          disabled={false}
          onChange={(ev, val) => setEntScale(val)}
        />
      </Stack.Item>
    </Stack>
  )
}



/*
 *   PortalNav
 *   Main Screen of the Helper
 *   All validation should live here
 */
export default function PortalNav({ config }) {

  console.log (`PortalNav: ${JSON.stringify(Object.keys(config))}`)
  
  const { tabLabels, defaults, entScaleOps, defaultOps } = config
  const [pivotkey, setPivotkey] = useState(Object.keys(tabLabels)[0])

  useAITracking("PortalNav", tabLabels[pivotkey])

  const [urlParams, setUrlParams] = useState(new URLSearchParams(window.location.search))
  const [invalidArray, setInvalidArray] = useState(() => Object.keys(defaults).reduce((a, c) => { return { ...a, [c]: [] } }, {}))

  const featureFlag = urlParams.has('feature')
  const [entScale, setEntScale] = useState(() => urlParams.has('entScale'))


  const sections = entScale ? entScaleOps : defaultOps
  const [selected, setSelected] = useState(() => { return {
        values: sections.reduce((a, s) => {
            return { ...a, [s.key]: urlParams.has(s.key) ? urlParams.get(s.key) : s.cards.find(c => c.default).key } 
          }, {}),
        entScale
      }
    })

  const [tabValues, setTabValues] = useState(() => {
    const clusterName = `az-k8s-${(Math.floor(Math.random() * 900000) + 100000).toString(36)}`

    // Apply selected presets to tab values
    const tabApplySections = Object.keys(selected.values).reduce((acc,curr) => 
      updateTabValues (acc, sections, curr, selected.values[curr])
    , defaults)

    // Apply dynamic presets to tab values
    const dynamicApplySections = {
      ...tabApplySections,
      deploy: {
        ...tabApplySections.deploy,
        clusterName,
        rg: `${clusterName}-rg`,
        ...(process.env.REACT_APP_K8S_VERSION && { kubernetesVersion: process.env.REACT_APP_K8S_VERSION })
      }
    }
    // Apply url params to tab values
    const urlApplySections = Object.keys(dynamicApplySections).reduce((acct, currt) => {  
        return {
          ...acct, 
          [currt]: Object.keys(dynamicApplySections[currt]).reduce((accv, currv) => {
            const urlname = `${currt}.${currv}`
            let valres =  dynamicApplySections[currt][currv]
            if (urlParams.has(urlname)) {
              let val = urlParams.get(urlname)
              valres = val === "true" ? true : val === "false" ? false : isNaN(val) ? val : parseInt(val)
            }
            return {...accv, [currv]: valres }}, {})
        }
    }, {})

    return  urlApplySections
  })


  function updateTabValues (currenttabValues, sections, sectionKey, cardKey) {
    const card_values = sections.find(s => s.key === sectionKey).cards.find(c => c.key === cardKey).values
    console.log (`updateTabValues: sectionKey=${sectionKey} cardKey=${cardKey}, setting tabs ${JSON.stringify(Object.keys(card_values))}`)
    return Object.keys(card_values).reduce((acc, curr) => {
      return {
        ...acc, 
        [curr]: {
          ...acc[curr],
          // resolve conditional params
          ...Object.keys(card_values[curr]).reduce((a, c) => {
            const val = card_values[curr][c]
            //console.log (`updateTabValues: looking for conditional value=${JSON.stringify(val)}`)
            // if value is array with at least 1 element with a object that has a properly 'set'
            const targetVal = Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0].hasOwnProperty("set") ?
              val.reduce((a, c) => a === undefined ? (c.page && c.field ? (currenttabValues[c.page][c.field] === c.value ? c.set : undefined) : c.set) : a, undefined)
              :
              val
            //console.log(`updateTabValues: setting tab=${curr}, field=${c} val=${JSON.stringify(val)} targetVal=${JSON.stringify(targetVal)}`)
            return { ...a, [c]: targetVal }
          }, {})
        }
      }
    }, currenttabValues)
  }

  function updateSelected(sectionKey, cardKey) {

    setUrlParams((currentUrlParams) => {

      if (selected.entScale !== entScale) {
        console.log (`User changed entScale switch, and selected a new card, need to unselect old cards`)
        defaultOps.forEach(element => {
          currentUrlParams.delete(element.key)
        })
        entScaleOps.forEach(element => {
          currentUrlParams.delete(element.key)
        })
      }
  
      if (entScale) {
        currentUrlParams.set('entScale', 1)
      } else {
        currentUrlParams.delete('entScale')
      }
      currentUrlParams.set(sectionKey,cardKey)
      return currentUrlParams
    })


    console.log (`updateSelected: sectionKey=${sectionKey} cardKey=${cardKey}`)
    setSelected({entScale, values: { ...(selected.entScale === entScale && selected.values), [sectionKey]: cardKey }})
    setTabValues(currentTabValues => updateTabValues(currentTabValues, sections, sectionKey, cardKey))
    
    //window.history.replaceState(null, null, "?"+urlParams.toString())
  }


  useEffect(() => {
    fetch('https://api.ipify.org?format=json').then(response => {
      return response.json();
    }).then((res) => {
      console.log (`useEffect Get IP`)
      setTabValues(currentTabValues => { return { 
          ...currentTabValues, 
          deploy: { 
            ...currentTabValues.deploy, 
            apiips: `${res.ip}/32` 
          } 
        } 
      })

    }).catch((err) => console.error('Problem fetching my IP', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  function _handleLinkClick(item) {
    setPivotkey(item.props.itemKey)
  }

  function mergeState(tab, field, value) {
    urlParams.set(`${tab}.${field}`, value)
    //window.history.replaceState(null, null, "?"+urlParams.toString())
    setTabValues((p) => {
      return {
        ...p, [tab]: {
          ...p[tab],
          [field]: value
        }
      }
    })
  }

  function getError(page, field) {
    return invalidArray[page].find(e => e.field === field)
  }


  function invalidFn(page, field, invalid, message) {
    const e = getError(page, field)
    if (!invalid && e) {
      setInvalidArray((prev) => { return { ...prev, [page]: prev[page].filter((e) => e.field !== field) } })
    } else if (invalid && !e) {
      setInvalidArray((prev) => { return { ...prev, [page]: prev[page].concat({ field, message }) } })
    }
  }

  const { deploy, cluster, net, addons } = tabValues

  invalidFn('cluster', 'osDiskType', cluster.osDiskType === 'Ephemeral' && !VMs.find(i => i.key === cluster.vmSize).eph,
    "The selected VM cache is not large enough to support Ephemeral. Select 'Managed' or a VM with a larger cache")
  invalidFn('cluster', 'aad_tenant_id', cluster.enable_aad && cluster.use_alt_aad && cluster.aad_tenant_id.length !== 36,
    "Enter Valid Directory ID")

  invalidFn('addons', 'registry', net.vnetprivateend && (addons.registry !== 'Premium' && addons.registry !== 'none'),
    "Premium tier is required for Private Link, either select Premium, or disable Private Link")
  invalidFn('addons', 'dnsZoneId', addons.dns && !addons.dnsZoneId.match('^/subscriptions/[^/ ]+/resourceGroups/[^/ ]+/providers/Microsoft.Network/(dnszones|privateDnsZones)/[^/ ]+$'),
    "Enter valid Azure Public or Private DNS Zone resourceId")
  invalidFn('addons', 'certEmail', addons.certMan && !addons.certEmail.match('^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$'),
    "Enter valid email for certificate generation")
  invalidFn('addons', 'kvId', addons.csisecret === "akvExist" && !addons.kvId.match('^/subscriptions/[^/ ]+/resourceGroups/[^/ ]+/providers/Microsoft.KeyVault/vaults/[^/ ]+$'),
    "Enter valid Azure KeyVault resourceId")
  invalidFn('addons', 'appgw_privateIpAddress', addons.ingress === "appgw" && addons.appgw_privateIp && !addons.appgw_privateIpAddress.match('^(?:[0-9]{1,3}.){3}[0-9]{1,3}$'),
    "Enter valid IP address")
  invalidFn('addons', 'appgwKVIntegration', addons.ingress === "appgw" && addons.appgwKVIntegration && addons.csisecret !== 'akvNew',
    "KeyVault integration requires the 'CSI Secrets' 'Yes, Provision a new KeyVault' option to be selected")
  invalidFn('net', 'byoAKSSubnetId', net.vnet_opt === 'byo' && !net.byoAKSSubnetId.match('^/subscriptions/[^/ ]+/resourceGroups/[^/ ]+/providers/Microsoft.Network/virtualNetworks/[^/ ]+/subnets/[^/ ]+$'),
    "Enter a valid Subnet Id where AKS nodes will be installed")
  invalidFn('net', 'byoAGWSubnetId', net.vnet_opt === 'byo' && addons.ingress === 'appgw' && !net.byoAGWSubnetId.match('^/subscriptions/[^/ ]+/resourceGroups/[^/ ]+/providers/Microsoft.Network/virtualNetworks/[^/ ]+/subnets/[^/ ]+$'),
    "Enter a valid Subnet Id where Application Gateway is installed")
  invalidFn('net', 'vnet_opt', net.vnet_opt === "default" && (net.afw || net.vnetprivateend),
    "Cannot use default networking of you select Firewall or Private Link")
  invalidFn('net', 'afw', net.afw && net.vnet_opt !== "custom",
    net.vnet_opt === "byo" ?
      "Please de-select, when using Bring your own VNET, configure a firewall as part of your own VNET setup, (in a subnet or peered network)"
      :
      "Template can only deploy Azure Firewall in single VNET with Custom Networking")

    invalidFn('deploy', 'apiips', cluster.apisecurity === 'whitelist' && deploy.apiips.length < 7,
      "Enter an IP/CIDR, or disable API Security in 'Cluster Details' tab")
    invalidFn('deploy', 'clusterName', !deploy.clusterName || deploy.clusterName.match(/^[a-z0-9][_\-a-z0-9]+[a-z0-9]$/i) === null || deploy.clusterName.length>19,
      "Enter valid cluster name")


  function _customRenderer(page, link, defaultRenderer) {
    return (
      <span>
        {invalidArray[page].length > 0 &&
          <Icon iconName="Warning12" style={{ color: 'red' }} />
        }
        {defaultRenderer(link)}
      </span>
    );
  }

  return (
    <main id="mainContent" className="wrapper">
      <ThemeProvider>
        <Header entScale={entScale} setEntScale={setEntScale} featureFlag={featureFlag} />


        <Stack verticalFill styles={{ root: { width: '960px', margin: '0 auto', color: 'grey' } }}>

          <Presents sections={sections} selectedValues={selected.values} updateSelected={updateSelected} />

          <Separator styles={{ root: { marginTop: "55px !important", marginBottom: "5px" } }}><b>Deploy</b> (optionally use 'Details' tabs for additional configuration)</Separator>

          <Pivot selectedKey={pivotkey} onLinkClick={_handleLinkClick} focusZoneProps={{ 'data-testid': `portalnav-Pivot`}}>
            <PivotItem headerText={tabLabels.deploy} itemKey="deploy" onRenderItemLink={(a, b) => _customRenderer('deploy', a, b)}>
              <DeployTab defaults={defaults} tabValues={tabValues} updateFn={(field, value) => mergeState("deploy", field, value)} invalidArray={invalidArray['deploy']} invalidTabs={Object.keys(invalidArray).filter(t => invalidArray[t].length > 0).map(k => `'${tabLabels[k]}'`)} urlParams={urlParams} />
            </PivotItem>
            <PivotItem headerText={tabLabels.cluster} itemKey="cluster" onRenderItemLink={(a, b) => _customRenderer('cluster', a, b)} >
              <ClusterTab tabValues={tabValues} updateFn={(field, value) => mergeState("cluster", field, value)} invalidArray={invalidArray['cluster']} />
            </PivotItem>
            <PivotItem headerText={tabLabels.addons} itemKey="addons" onRenderItemLink={(a, b) => _customRenderer('addons', a, b)} >
              <AddonsTab tabValues={tabValues} updateFn={(field, value) => mergeState("addons", field, value)} invalidArray={invalidArray['addons']} />
            </PivotItem>
            <PivotItem headerText={tabLabels.net} itemKey="net" onRenderItemLink={(a, b) => _customRenderer('net', a, b)}>
              <NetworkTab tabValues={tabValues} featureFlag={featureFlag} updateFn={(field, value) => mergeState("net", field, value)} invalidArray={invalidArray['net']} />
            </PivotItem>
            <PivotItem headerText={tabLabels.app} itemKey="app" onRenderItemLink={(a, b) => _customRenderer('app', a, b)}>
              <AppsTab tabValues={tabValues} featureFlag={featureFlag} updateFn={(field, value) => mergeState("app", field, value)} invalidArray={invalidArray['app']} />
            </PivotItem>
          </Pivot>

        </Stack>
      </ThemeProvider>
    </main >
  )
}



