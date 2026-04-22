def SERVICES = [
    [
        name: 'auth-users',
        type: 'maven',
        workDir: 'services/auth-users',
        dockerContext: 'services/auth-users',
        k8sFiles: ['k8s/auth-users-deployment.yaml', 'k8s/auth-users-service.yaml'],
        deployment: 'auth-users',
        container: 'auth-users'
    ],
    [
        name: 'deployment-monitoring',
        type: 'maven',
        workDir: 'services/deployment-monitoring',
        dockerContext: 'services/deployment-monitoring',
        k8sFiles: ['k8s/deployment-monitoring-deployment.yaml', 'k8s/deployment-monitoring-service.yaml'],
        deployment: 'deployment-monitoring',
        container: 'deployment-monitoring'
    ],
    [
        name: 'cloudpricer-alert',
        type: 'maven',
        workDir: 'services/cloudpricer-alert',
        dockerContext: 'services/cloudpricer-alert',
        k8sFiles: ['k8s/cloudpricer-alert-deployment.yaml', 'k8s/cloudpricer-alert-service.yaml'],
        deployment: 'cloudpricer-alert',
        container: 'cloudpricer-alert'
    ],
    [
        name: 'dashboard-gateway',
        type: 'maven',
        workDir: 'services/dashboard-gateway/gateway',
        dockerContext: 'services/dashboard-gateway/gateway',
        k8sFiles: ['k8s/dashboard-gateway-deployment.yaml', 'k8s/dashboard-gateway-service.yaml'],
        deployment: 'dashboard-gateway',
        container: 'dashboard-gateway'
    ],
]

@NonCPS
def parseCsv(String csv) {
    if (!csv?.trim()) return []
    return csv.split(',').collect { it.trim() }.findAll { it }
}

pipeline {
    agent any

    options {
        skipDefaultCheckout()
        timestamps()
    }

    tools {
        maven 'mvn'
        nodejs 'node'
    }

    parameters {
        string(name: 'NEXUS_REGISTRY', defaultValue: '192.168.56.30', description: 'Docker registry host (Nexus)')
        string(name: 'K8S_NAMESPACE', defaultValue: 'application', description: 'Kubernetes namespace (dev/staging/prod)')
        booleanParam(name: 'DEPLOY_ALL', defaultValue: false, description: 'Force build/push/deploy all services')
        booleanParam(name: 'RUN_TESTS', defaultValue: false, description: 'Run mvn test for changed services')
    }

    environment {
        DOCKER_BUILDKIT = '1'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git rev-parse --is-inside-work-tree'
                // Ensure origin/* is available for merge-base on multibranch/PR jobs
                sh 'git fetch --no-tags origin +refs/heads/*:refs/remotes/origin/* || true'
            }
        }

        stage('Detect Changes') {
            steps {
                script {
                    def headCommit = env.GIT_COMMIT?.trim() ? env.GIT_COMMIT : 'HEAD'
                    def baseCommit = env.GIT_PREVIOUS_SUCCESSFUL_COMMIT?.trim()

                    if (!baseCommit) {
                        if (env.CHANGE_TARGET?.trim()) {
                            baseCommit = sh(returnStdout: true, script: "git merge-base ${headCommit} origin/${env.CHANGE_TARGET}").trim()
                        } else if (env.BRANCH_NAME?.trim()) {
                            // Branch build: compare to merge-base with remote branch, else fall back to main.
                            baseCommit = sh(returnStdout: true, script: "git merge-base ${headCommit} origin/${env.BRANCH_NAME} || git merge-base ${headCommit} origin/main").trim()
                        } else {
                            // Fallback: first commit in repo -> treat as full deploy.
                            baseCommit = sh(returnStdout: true, script: "git rev-list --max-parents=0 ${headCommit} | tail -n 1").trim()
                        }
                    }

                    def changedRaw = sh(returnStdout: true, script: "git diff --name-only ${baseCommit}..${headCommit} || true").trim()
                    def changed = changedRaw ? changedRaw.split("\n") as List : []

                    def deployAll = params.DEPLOY_ALL
                    // If the diff is empty but we don't have previous successful commit context, err on the safe side.
                    if (!env.GIT_PREVIOUS_SUCCESSFUL_COMMIT?.trim() && changed.isEmpty()) {
                        deployAll = true
                    }

                    def touchedPath = { String prefix -> changed.any { it.startsWith(prefix) } }
                    def touchedAny = { List<String> prefixes -> prefixes.any { p -> touchedPath(p) } }

                    def changedServices = []

                    SERVICES.each { svc ->
                        def prefixes = ["${svc.workDir}/", "${svc.dockerContext}/", "k8s/${svc.name}-"]
                        if (deployAll || touchedAny(prefixes)) {
                            changedServices << svc.name
                        }
                    }

                    // Infra / pipeline change => deploy all
                    if (deployAll || touchedAny(['k8s/', 'Jenkinsfile'])) {
                        changedServices = SERVICES.collect { it.name }
                    }

                    env.CHANGED_FILES_COUNT = "${changed.size()}"
                    env.CHANGED_SERVICES = changedServices.unique().join(',')
                    env.GIT_DIFF_BASE = baseCommit

                    echo "Diff base: ${baseCommit}"
                    echo "Changed files (${changed.size()}): ${changedRaw ?: '(none)'}"
                    echo "Changed services: ${env.CHANGED_SERVICES ?: '(none)'}"
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    def selected = parseCsv(env.CHANGED_SERVICES)
                    if (!selected) {
                        echo 'No service changes detected; skipping Build'
                        return
                    }

                    def stagesMap = [:]
                    SERVICES.findAll { selected.contains(it.name) }.each { svc ->
                        stagesMap[svc.name] = {
                            dir(svc.workDir) {
                                if (!fileExists('pom.xml')) {
                                    echo "${svc.name}: pom.xml missing; skipping build (scaffold only)"
                                    return
                                }
                                sh 'mvn -B -DskipTests package'
                                if (params.RUN_TESTS) {
                                    sh 'mvn -B test'
                                }
                            }
                        }
                    }

                    parallel stagesMap
                }
            }
        }

        stage('Build and Push Docker Images to Nexus') {
            when {
                expression { return parseCsv(env.CHANGED_SERVICES).size() > 0 }
            }
            steps {
                script {
                    def selected = parseCsv(env.CHANGED_SERVICES)
                    def tag = env.BUILD_NUMBER

                    withCredentials([usernamePassword(
                        credentialsId: 'nexus-creds',
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASSWORD'
                    )]) {
                        sh """
                            set -euo pipefail
                            echo \"$NEXUS_PASSWORD\" | docker login ${params.NEXUS_REGISTRY} -u \"$NEXUS_USER\" --password-stdin
                        """

                        SERVICES.findAll { selected.contains(it.name) }.each { svc ->
                            dir(svc.dockerContext) {
                                if (!fileExists('Dockerfile')) {
                                    echo "${svc.name}: Dockerfile missing; skipping docker build"
                                    return
                                }
                                if (svc.type == 'maven' && !fileExists('pom.xml')) {
                                    echo "${svc.name}: pom.xml missing; skipping docker build (scaffold only)"
                                    return
                                }
                                // Dockerfile expects target/*.jar for Spring services
                                if (svc.type == 'maven') {
                                    def hasJar = sh(returnStatus: true, script: 'ls -1 target/*.jar >/dev/null 2>&1') == 0
                                    if (!hasJar) {
                                        echo "${svc.name}: no target/*.jar found; skipping docker build"
                                        return
                                    }
                                }

                                def imageBase = "${params.NEXUS_REGISTRY}/${svc.name}"
                                sh "docker build -t ${imageBase}:${tag} -t ${imageBase}:latest ."
                                sh "docker push ${imageBase}:${tag}"
                                sh "docker push ${imageBase}:latest"
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            when {
                expression { return parseCsv(env.CHANGED_SERVICES).size() > 0 }
            }
            steps {
                script {
                    def ns = params.K8S_NAMESPACE
                    def selected = parseCsv(env.CHANGED_SERVICES)
                    def tag = env.BUILD_NUMBER

                    // Ensure namespace exists
                    sh "kubectl get namespace ${ns} >/dev/null 2>&1 || kubectl create namespace ${ns}"

                    // Ensure imagePullSecret exists (create only if missing)
                    withCredentials([usernamePassword(
                        credentialsId: 'nexus-creds',
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASSWORD'
                    )]) {
                        sh """
                            set -euo pipefail
                            if ! kubectl -n ${ns} get secret nexus-regcred >/dev/null 2>&1; then
                              kubectl -n ${ns} create secret docker-registry nexus-regcred \
                                --docker-server=${params.NEXUS_REGISTRY} \
                                --docker-username=\"$NEXUS_USER\" \
                                --docker-password=\"$NEXUS_PASSWORD\" \
                                --docker-email=devnull@example.com
                            else
                              echo 'nexus-regcred already exists; not overwriting'
                            fi
                        """
                    }

                    SERVICES.findAll { selected.contains(it.name) }.each { svc ->
                        // Apply only this service manifests
                        svc.k8sFiles.each { f ->
                            if (fileExists(f)) {
                                sh "kubectl -n ${ns} apply -f ${f}"
                            } else {
                                error "Missing k8s manifest: ${f}"
                            }
                        }

                        def image = "${params.NEXUS_REGISTRY}/${svc.name}:${tag}"
                        sh "kubectl -n ${ns} set image deployment/${svc.deployment} ${svc.container}=${image}"

                        def status = sh(returnStatus: true, script: "kubectl -n ${ns} rollout status deployment/${svc.deployment} --timeout=180s")
                        if (status != 0) {
                            sh "kubectl -n ${ns} rollout undo deployment/${svc.deployment} || true"
                            error "Rollout failed for ${svc.name}; rollback executed"
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline success'
        }
        failure {
            echo 'Pipeline failed'
        }
    }
}
