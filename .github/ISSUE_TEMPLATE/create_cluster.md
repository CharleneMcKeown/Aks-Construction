name: Create AKS Cluster
description: 'Create a new cluster once the issue form is created'
title: 'New Cluster request: '
labels: deploy
assignees:
    - octocat

body: 
- type: checkboxes
  id: Operations Principles
  attributes:
    label: 'Which type of cluster do you want to deploy:'
    description: Select one. Refer to documentation (link) for guidance.
    options:
        - label: 'Simplest, bare-bones cluster'
        - label: 'I prefer control & community oss'
        - label: 'I want a managed environment'

- type: checkboxes
  id: Security Principles
  attributes:
    label: 'Which Security Principles would you like to apply:'
    description: Select one. Refer to documentation (link) for guidance.
    options:
        - label: 'Simple, no access limitations'
        - label: 'Cluster with additional security controls'
        - label: 'Private cluster with isolating network controls'

- type: input
  id: Cluster Name
  attributes:
    label: 'Cluster Name:'
    description: Pick your Cluster name.
    placeholder: 'az-k8s-ezna'
  validations:
    required: true

- type: input
  id: Resource Group Name
  attributes:
    label: 'Resource Group Name:'
    description: Pick your Resource Group name.
    placeholder: 'az-k8s-ezna-rg'
  validations:
    required: true

- type: input
  id: Kubernetes Version
  attributes:
    label: 'Kubernetes Version:'
    description: Pick a Kubernetes Version.
    placeholder: '1.20.9'
  validations:
    required: true

- type: input
  id: Location
  attributes:
    label: 'Location:'
    description: Location.
    placeholder: "West Europe"
  validations:
    required: true