pipeline {
    agent any
    options {
        skipDefaultCheckout()
    }
    tools {
        maven 'mvn'
        nodejs 'node'
    }

    environment {
        // TEST MODE: Force all stages to run (set to 'true' for testing, use change detection in production)
        CHANGED_AUTH       = 'true'
        CHANGED_PRICER     = 'false'
        CHANGED_DASHBOARD  = 'false'
        CHANGED_FRONTEND   = 'true'
        CHANGED_K8S        = 'false'
        CHANGED_MONITORING = 'false'
        // Aggregate flags - set to true for full pipeline testing
        CHANGED_BACKEND    = 'true'
        CHANGED_ANY_IMAGE  = 'true'
        CHANGED_DEPLOY     = 'true'

        // Kubernetes rollout timeout (e.g. '600s', '10m')
        K8S_ROLLOUT_TIMEOUT = '600s'
    }

    stages {

        // ─────────────────────────────────────────────
        stage('Checkout') {
            steps {
                git branch: 'main', credentialsId: 'Git tok en', url: 'https://github.com/mehdibha09/web-pfe.git'
            }
        }

        // ─────────────────────────────────────────────
        stage('Detect Changes') {
            steps {
                script {
                    // Sur le premier commit il n'y a pas de HEAD~1 → fallback sur tous les fichiers
                    def changedFiles = sh(
                        script: '''
                            git diff --name-only HEAD~1 HEAD 2>/dev/null \
                            || git diff --name-only $(git rev-list --max-parents=0 HEAD) HEAD
                        ''',
                        returnStdout: true
                    ).trim()

                    echo "Fichiers modifiés :\n${changedFiles}"

                    // ✅ Service actif
                    env.CHANGED_AUTH       = changedFiles.contains('authService/')   ? 'true' : 'false'

                    // ⛔ Services désactivés temporairement (focus authService only)
                    // env.CHANGED_PRICER     = changedFiles.contains('cloudPricer/') ? 'true' : 'false'
                    // env.CHANGED_DASHBOARD  = changedFiles.contains('dashboard/')   ? 'true' : 'false'
                    // env.CHANGED_FRONTEND   = changedFiles.contains('frontend/')    ? 'true' : 'false'
                    // env.CHANGED_K8S        = changedFiles.contains('k8s/')         ? 'true' : 'false'
                    // env.CHANGED_MONITORING = changedFiles.contains('monitoring/')  ? 'true' : 'false'
                    env.CHANGED_PRICER     = 'false'
                    env.CHANGED_DASHBOARD  = 'false'
                    env.CHANGED_FRONTEND   = 'false'
                    env.CHANGED_K8S        = 'false'
                    env.CHANGED_MONITORING = 'false'

                    // Agrégats utiles pour les conditions globales
                    env.CHANGED_BACKEND = (
                        env.CHANGED_AUTH      == 'true' ||
                        env.CHANGED_PRICER    == 'true' ||
                        env.CHANGED_DASHBOARD == 'true'
                    ) ? 'true' : 'false'

                    env.CHANGED_ANY_IMAGE = (
                        env.CHANGED_BACKEND  == 'true' ||
                        env.CHANGED_FRONTEND == 'true'
                    ) ? 'true' : 'false'

                    env.CHANGED_DEPLOY = (
                        env.CHANGED_ANY_IMAGE == 'true' ||
                        env.CHANGED_K8S       == 'true'
                    ) ? 'true' : 'false'

                    echo """
                        ┌──────────────────────────────┐
                        │  Résumé des changements       │
                        ├──────────────────┬───────────┤
                        │ authService      │ ${env.CHANGED_AUTH}     │
                        │ cloudPricer      │ ${env.CHANGED_PRICER}     │
                        │ dashboard        │ ${env.CHANGED_DASHBOARD}     │
                        │ frontend         │ ${env.CHANGED_FRONTEND}     │
                        │ k8s              │ ${env.CHANGED_K8S}     │
                        │ monitoring       │ ${env.CHANGED_MONITORING}     │
                        └──────────────────┴───────────┘
                    """
                }
            }
        }

        // ─────────────────────────────────────────────
stage('Build') {
            steps {
                script {

                    if (env.CHANGED_AUTH == 'true') {
                        dir('authService') {
                            sh 'mvn clean install -DskipTests'
                        }
                    }

                    if (env.CHANGED_PRICER == 'true') {
                        dir('cloudPricer') {
                            sh 'mvn clean install -DskipTests'
                        }
                    }

                    if (env.CHANGED_DASHBOARD == 'true') {
                        dir('dashboard') {
                            sh 'mvn clean install -DskipTests'
                        }
                    }

                    if (env.CHANGED_FRONTEND == 'true') {
                        dir('frontend') {
                            sh '''
                                node -v
                                npm -v
                            '''
                            sh 'npm ci'
                            sh 'npm run build'
                        }
                    }
                }
            }
        }

        // stage('Test') {
        //     steps {
        //         script {

        //             if (env.CHANGED_AUTH == 'true') {
        //                 dir('authService') {
        //                     sh 'mvn test'
        //                 }
        //             }

        //             if (env.CHANGED_PRICER == 'true') {
        //                 dir('cloudPricer') {
        //                     sh 'mvn test'
        //                 }
        //             }

        //             if (env.CHANGED_DASHBOARD == 'true') {
        //                 dir('dashboard') {
        //                     sh 'mvn test'
        //                 }
        //             }
        //         }
        //     }
        // }

        

        // ─────────────────────────────────────────────
        // stage('Start Security VM') {
        //     when { expression { env.CHANGED_ANY_IMAGE == 'true' } }
        //     steps {
        //         sh '''
        //             set -x
        //             ssh -T -i /var/jenkins_home/.ssh/id_rsa_vmjenkins_nopass \
        //                 -o StrictHostKeyChecking=no mehdi@192.168.1.15 '
        //             STATE=$(VBoxManage showvminfo securite --machinereadable | grep VMState=)
        //             if echo "$STATE" | grep -q poweroff; then
        //                 echo "Démarrage Security VM"
        //                 VBoxManage startvm securite --type headless
        //                 sleep 15
        //             else
        //                 echo "Security VM déjà en cours"
        //             fi
        //             '
        //         '''
        //     }
        // }

        // ─────────────────────────────────────────────
        // stage('Wait for VM') {
        //     when { expression { env.CHANGED_ANY_IMAGE == 'true' } }
        //     steps {
        //         echo 'Attente 60 secondes pour le démarrage de la Security VM...'
        //         sleep(time: 60, unit: 'SECONDS')
        //     }
        // }

        // ─────────────────────────────────────────────
        stage('Sonar Analysis') {
            when { expression { env.CHANGED_BACKEND == 'true' } }

            stages {
                stage('Sonar authService') {
                    when { expression { env.CHANGED_AUTH == 'true' } }
                    steps {
                        dir('authService') {
                            withSonarQubeEnv('SonarQubeScanner') {
                                sh 'mvn sonar:sonar'
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                timeout(time: 2, unit: 'MINUTES') {
                                    def qg = waitForQualityGate()
                                    if (qg.status != 'OK') {
                                        error "Quality Gate authService failed: ${qg.status}"
                                    } else {
                                        echo "Sonar authService : OK"
                                    }
                                }
                            }
                        }
                        failure { echo "Sonar authService : échec d'exécution." }
                    }
                }

                stage('Sonar cloudPricer') {
                    // Désactivé temporairement: focus authService only
                    when { expression { env.CHANGED_PRICER == 'true' } }
                    steps {
                        dir('cloudPricer') {
                            withSonarQubeEnv('SonarQubeScanner') {
                                sh 'mvn sonar:sonar'
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                timeout(time: 2, unit: 'MINUTES') {
                                    def qg = waitForQualityGate()
                                    if (qg.status != 'OK') {
                                        error "Quality Gate cloudPricer failed: ${qg.status}"
                                    } else {
                                        echo "Sonar cloudPricer : OK"
                                    }
                                }
                            }
                        }
                        failure { echo "Sonar cloudPricer : échec d'exécution." }
                    }
                }
                stage('Sonar dashboard') {
                    // Désactivé temporairement: focus authService only
                    when { expression { env.CHANGED_DASHBOARD == 'true' } }
                    steps {
                        dir('dashboard') {
                            withSonarQubeEnv('SonarQubeScanner') {
                                sh 'mvn sonar:sonar'
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                timeout(time: 2, unit: 'MINUTES') {
                                    def qg = waitForQualityGate()
                                    if (qg.status != 'OK') {
                                        error "Quality Gate dashboard failed: ${qg.status}"
                                    } else {
                                        echo "Sonar dashboard : OK"
                                    }
                                }
                            }
                        }
                        failure { echo "Sonar dashboard : échec d'exécution." }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────
        stage('Build and Push Docker Images to Nexus') {
            agent { label 'security' }
            when { expression { env.CHANGED_ANY_IMAGE == 'true' } }

            steps {
                git branch: 'main', credentialsId: 'Git tok en', url: 'https://github.com/mehdibha09/web-pfe'

                withCredentials([usernamePassword(
                    credentialsId: 'nexus-creds',
                    usernameVariable: 'NEXUS_USER',
                    passwordVariable: 'NEXUS_PASSWORD'
                )]) {
                    script {
                        sh "echo \$NEXUS_PASSWORD | docker login 192.168.56.30 -u \$NEXUS_USER --password-stdin"

                        def services = [
                            [folder: 'authService',  image: 'auth-service',    changed: env.CHANGED_AUTH],
                            [folder: 'cloudPricer',  image: 'cloud-pricer',    changed: env.CHANGED_PRICER],
                            [folder: 'dashboard',    image: 'dashboard',       changed: env.CHANGED_DASHBOARD],
                            [folder: 'frontend',     image: 'frontend', changed: env.CHANGED_FRONTEND],
                        ]

                        services.each { svc ->
                            if (svc.changed == 'true') {
                                echo "→ Build & Push image : ${svc.image}"
                                sh """
                                    set -x
                                    IMAGE_TAG=${BUILD_NUMBER}

                                    docker build \
                                        -t 192.168.56.30/${svc.image}:\${IMAGE_TAG} \
                                        -t 192.168.56.30/${svc.image}:latest \
                                        ${svc.folder}

                                    docker push 192.168.56.30/${svc.image}:\${IMAGE_TAG}
                                    docker push 192.168.56.30/${svc.image}:latest
                                """
                            } else {
                                echo "→ Aucun changement dans ${svc.folder}, image ignorée."
                            }
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────
        stage('Create DBs') {
            agent { label 'k8s-agent' }
            when { expression { env.CHANGED_BACKEND == 'true' } }

            environment {
                DB_HOST = '192.168.56.40'
            }

            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'db-creds',
                    usernameVariable: 'DB_USER',
                    passwordVariable: 'DB_PASSWORD'
                )]) {
                    script {
                        withEnv(["PGPASSWORD=${DB_PASSWORD}"]) {
                            // Create only databases that are actually used by microservices
                            def databases = ['auth_service']  // authService uses this database
                            databases.each { dbName ->
                                sh """
                                    psql -h ${DB_HOST} -U ${DB_USER} -d postgres \
                                        -tc "SELECT 1 FROM pg_database WHERE datname = '${dbName}'" \
                                        | grep -q 1 || \
                                    psql -h ${DB_HOST} -U ${DB_USER} -d postgres \
                                        -c "CREATE DATABASE ${dbName};"
                                """
                            }

                            // Safety net for schema drift: ensure full auth_service schema exists
                            sh '''
                                psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -U "$DB_USER" -d auth_service <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    contact_email text,
    mode_deployment text,
    status text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tenants_name_uk UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    CONSTRAINT permissions_name_uk UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT roles_tenant_name_uk UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email text NOT NULL,
    password text NOT NULL,
    status text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_tenant_email_uk UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    assigned_by uuid,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    assigned_by uuid,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expiration_date timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    ip_address text,
    revoked_at timestamptz,
    browser text,
    os text,
    localization text,
    CONSTRAINT sessions_access_token_uk UNIQUE (access_token),
    CONSTRAINT sessions_refresh_token_uk UNIQUE (refresh_token)
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action text NOT NULL,
    timestamp timestamptz NOT NULL DEFAULT now(),
    details text,
    resource text,
    resource_id text
);

CREATE INDEX IF NOT EXISTS audit_logs_tenant_ts_idx ON audit_logs(tenant_id, timestamp);

CREATE TABLE IF NOT EXISTS user_two_factor (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret text NOT NULL,
    enabled boolean NOT NULL DEFAULT false,
    backup_codes_json text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS sso_identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    subject text NOT NULL,
    email text NOT NULL,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sso_identities_provider_subject_uk UNIQUE (provider, subject)
);

CREATE INDEX IF NOT EXISTS sso_identities_provider_email_idx ON sso_identities(provider, email);
SQL
                            '''
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────
        stage('Security Scan') {
            agent { label 'security' }
            when { expression { env.CHANGED_ANY_IMAGE == 'true' } }

            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'nexus-creds',
                    usernameVariable: 'NEXUS_USER',
                    passwordVariable: 'NEXUS_PASSWORD'
                )]) {
                    script {
                        sh "echo \$NEXUS_PASSWORD | docker login 192.168.56.30 -u \$NEXUS_USER --password-stdin"

                        def images = [
                            [name: 'auth-service',    changed: env.CHANGED_AUTH],
                            [name: 'cloud-pricer',    changed: env.CHANGED_PRICER],
                            [name: 'dashboard',       changed: env.CHANGED_DASHBOARD],
                            [name: 'frontend', changed: env.CHANGED_FRONTEND],
                        ]

                        images.each { img ->
                            if (img.changed == 'true') {
                                echo "→ Trivy scan : ${img.name}"
                                sh """
                                    set -x
                                    docker run --rm \
                                        -v /var/run/docker.sock:/var/run/docker.sock \
                                        -v /opt/trivy-cache:/root/.cache/trivy \
                                        -v /mnt/nfs/trivy/results:/results \
                                        aquasec/trivy image \
                                        --severity HIGH,CRITICAL \
                                        --format json \
                                        --output /results/${img.name}.json \
                                        192.168.56.30/${img.name}:latest

                                    docker run --rm \
                                        -v /var/run/docker.sock:/var/run/docker.sock \
                                        -v /opt/trivy-cache:/root/.cache/trivy \
                                        -v /mnt/nfs/trivy/results:/results \
                                        aquasec/trivy image \
                                        --severity HIGH,CRITICAL \
                                        --format template \
                                        --template "@/contrib/html.tpl" \
                                        --output /results/${img.name}.html \
                                        192.168.56.30/${img.name}:latest
                                """
                            } else {
                                echo "→ Aucun changement pour ${img.name}, scan ignoré."
                            }
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────
        stage('Publish Security Reports trivey') {
            agent { label 'security' }
            when { expression { env.CHANGED_ANY_IMAGE == 'true' } }

            steps {
                script {
                    sh 'mkdir -p reports/trivy reports/zap'

                    def images = [
                        [name: 'auth-service',    changed: env.CHANGED_AUTH],
                        [name: 'cloud-pricer',    changed: env.CHANGED_PRICER],
                        [name: 'dashboard',       changed: env.CHANGED_DASHBOARD],
                        [name: 'frontend', changed: env.CHANGED_FRONTEND],
                    ]

                    images.each { img ->
                        if (img.changed == 'true') {
                            sh """
                                cp -f /mnt/nfs/trivy/results/${img.name}.json reports/trivy/ 2>/dev/null || true
                                cp -f /mnt/nfs/trivy/results/${img.name}.html reports/trivy/ 2>/dev/null || true
                            """
                        }
                    }

                    archiveArtifacts artifacts: 'reports/**/*.html, reports/**/*.json', allowEmptyArchive: true

                    images.each { img ->
                        if (img.changed == 'true') {
                            publishHTML(target: [
                                allowMissing: true,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'reports/trivy',
                                reportFiles: "${img.name}.html",
                                reportName: "Trivy Report - ${img.name}"
                            ])
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────
        stage('Deploy to Kubernetes') {
            agent { label 'k8s-agent' }
            when { expression { env.CHANGED_DEPLOY == 'true' } }

            steps {
                git branch: 'main', credentialsId: 'Git tok en', url: 'https://github.com/mehdibha09/web-pfe.git'

                withCredentials([usernamePassword(
                    credentialsId: 'nexus-creds',
                    usernameVariable: 'NEXUS_USER',
                    passwordVariable: 'NEXUS_PASSWORD'
                )]) {
                    script {
                        dir('k8s') {
                            sh '''
                                set -x

                                # Create namespace
                                kubectl apply -f namespace.yaml

                                # Create Docker registry secret for Nexus
                                kubectl -n app-pfe create secret docker-registry nexus-regcred \
                                    --docker-server=192.168.56.30 \
                                    --docker-username=$NEXUS_USER \
                                    --docker-password=$NEXUS_PASSWORD \
                                    --docker-email=devnull@example.com \
                                    --dry-run=client -o yaml | kubectl apply -f -

                                # Create backend ConfigMap with Spring configuration
                                kubectl -n app-pfe create configmap backend-config \
                                    --from-literal=SPRING_PROFILES_ACTIVE=prod \
                                    --from-literal=DB_HOST=postgres \
                                    --from-literal=DB_PORT=5432 \
                                    --from-literal=DB_NAME=auth_service \
                                    --from-literal=MAIL_HOST=smtp-relay.brevo.com \
                                    --from-literal=MAIL_PORT=587 \
                                    --dry-run=client -o yaml | kubectl apply -f -

                                # Create postgres-secret with database credentials
                                kubectl -n app-pfe create secret generic postgres-secret \
                                    --from-literal=POSTGRES_USER=auth_user \
                                    --from-literal=POSTGRES_PASSWORD=password \
                                    --from-literal=DB_USERNAME=auth_user \
                                    --from-literal=DB_PASSWORD=password \
                                    --dry-run=client -o yaml | kubectl apply -f -

                                # Deploy authService with database
                                kubectl apply -f authService.yaml

                                # Deploy frontend
                                kubectl apply -f frontend.yaml
                            '''

                            // Mettre à jour l'image uniquement pour les services reconstruits
                            def services = [
                                [image: 'auth-service',    deployment: 'auth-service',    container: 'auth-service',    changed: env.CHANGED_AUTH],
                                [image: 'cloud-pricer',    deployment: 'cloud-pricer',    container: 'cloud-pricer',    changed: env.CHANGED_PRICER],
                                [image: 'dashboard',       deployment: 'dashboard',       container: 'dashboard',       changed: env.CHANGED_DASHBOARD],
                                [image: 'frontend', deployment: 'frontend',        container: 'frontend',        changed: env.CHANGED_FRONTEND],
                            ]

                            services.each { svc ->
                                if (svc.changed == 'true') {
                                    sh """
                                        set -x
                                        kubectl -n app-pfe set image \
                                            deployment/${svc.deployment} \
                                            ${svc.container}=192.168.56.30/${svc.image}:${BUILD_NUMBER}

                                        kubectl -n app-pfe rollout status \
                                            deployment/${svc.deployment} --timeout=${env.K8S_ROLLOUT_TIMEOUT}
                                    """
                                } else {
                                    echo "→ Déploiement ignoré pour ${svc.deployment} (aucun changement)"
                                }
                            }

                            // Déployer la config monitoring si modifiée
                            if (env.CHANGED_MONITORING == 'true') {
                                echo "→ Mise à jour de la configuration monitoring"
                                sh 'kubectl apply -f ../monitoring/ 2>/dev/null || true'
                            }
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────
        // stage('OWASP ZAP Full Scan') {
        //     agent { label 'security' }
        //     when { expression { env.CHANGED_ANY_IMAGE == 'true' } }

        //     steps {
        //         script {
        //             int zapExitCode = sh(
        //                 script: """
        //                     set -x
        //                     docker run --rm \
        //                         --name owasp-zap-scan-${BUILD_NUMBER} \
        //                         --cpus="0.7" \
        //                         -v /mnt/nfs/owasp-zap:/zap/wrk \
        //                         ghcr.io/zaproxy/zaproxy:stable \
        //                         zap-full-scan.py \
        //                         -t http://192.168.56.10:30080 \
        //                         -J /zap/wrk/zap-report-${BUILD_NUMBER}.json \
        //                         -r /zap/wrk/zap-report-${BUILD_NUMBER}.html
        //                 """,
        //                 returnStatus: true
        //             )

        //             if (zapExitCode == 0) {
        //                 echo 'OWASP ZAP : aucune vulnérabilité (code 0).'
        //             } else if (zapExitCode == 2) {
        //                 echo 'OWASP ZAP : vulnérabilités détectées (code 2).'
        //             } else if (zapExitCode == 3) {
        //                 echo 'OWASP ZAP : vulnérabilités MEDIUM/HIGH détectées (code 3).'
        //             } else {
        //                 error "OWASP ZAP a échoué (code ${zapExitCode})"
        //             }
        //         }
        //     }
        // }

        // // ─────────────────────────────────────────────
        // stage('Publish Security Reports owasp zap') {
        //     agent { label 'security' }
        //     when { expression { env.CHANGED_ANY_IMAGE == 'true' } }

        //     steps {
        //         sh """
        //             set -x
        //             cp -f /mnt/nfs/owasp-zap/zap-report-${BUILD_NUMBER}.html reports/zap/ 2>/dev/null || true
        //             cp -f /mnt/nfs/owasp-zap/zap-report-${BUILD_NUMBER}.json reports/zap/ 2>/dev/null || true
        //         """

        //         archiveArtifacts artifacts: 'reports/**/*.html, reports/**/*.json', allowEmptyArchive: true

        //         publishHTML(target: [
        //             allowMissing: true,
        //             alwaysLinkToLastBuild: true,
        //             keepAll: true,
        //             reportDir: 'reports/zap',
        //             reportFiles: "zap-report-${BUILD_NUMBER}.html",
        //             reportName: 'OWASP ZAP Report'
        //         ])
        //     }
        // }

        // // ─────────────────────────────────────────────
        // stage('Stop Security VM') {
        //     when { expression { env.CHANGED_ANY_IMAGE == 'true' } }
        //     steps {
        //         sh '''
        //             ssh -T -i /var/jenkins_home/.ssh/id_rsa_vmjenkins_nopass \
        //                 -o StrictHostKeyChecking=no mehdi@192.168.1.15 '
        //             STATE=$(VBoxManage showvminfo securite --machinereadable | grep VMState=)
        //             if echo "$STATE" | grep -q running; then
        //                 echo "Arrêt Security VM"
        //                 VBoxManage controlvm securite acpipowerbutton
        //             else
        //                 echo "Security VM déjà arrêtée"
        //             fi
        //             '
        //         '''
        //     }
        // }

    }

    post {
        success { echo 'Pipeline terminé avec succès !' }
        failure { echo 'Pipeline en échec. Consulter les logs.' }
    }
}


