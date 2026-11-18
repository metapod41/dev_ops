// ===============================================
// Jenkinsfile — Declarative CI pipeline for todo-api
// -----------------------------------------------
// Flow: Checkout -> Env Info -> Install -> Test -> Build & Package -> Archive
//       -> Docker Build (optional)
// Requirements on the agent: git, Node.js 18+ and npm (install Node on the
// agent or use the NodeJS plugin). Docker is optional.
// ===============================================

pipeline {
    agent any

    environment {
        NODE_ENV     = 'test'
        APP_NAME     = 'todo-api'
        ARTIFACT_DIR = 'artifacts'
        // IMAGE_TAG (BUILD_NUMBER-shortSHA) is computed in the Checkout stage,
        // because GIT_COMMIT can still be null when this block is evaluated.
    }

    // Poll the repository every minute and build when there is a new commit.
    // Alternative: a GitHub webhook (GitHub plugin + "GitHub hook trigger for
    // GITScm polling") triggers instantly, but needs Jenkins reachable from
    // the internet — polling works for a local Jenkins.
    triggers {
        pollSCM('* * * * *')
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))  // keep the last 10 builds
        timeout(time: 15, unit: 'MINUTES')              // kill hung builds
        timestamps()                                    // timestamp each log line
        disableConcurrentBuilds()                       // one build at a time
    }

    stages {

        // ---------------------------------------
        stage('Checkout') {
            steps {
                echo "==> Checking out source code..."
                checkout scm
                sh 'git log -1 --pretty=format:"%h - %an, %ar : %s"'
                script {
                    def commit = env.GIT_COMMIT ?: sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${commit.take(7)}"
                }
                echo "==> Image tag for this build: ${env.IMAGE_TAG}"
            }
        }

        // ---------------------------------------
        stage('Environment Info') {
            steps {
                echo "==> Tool versions on this agent:"
                sh 'node --version'
                sh 'npm --version'
            }
        }

        // ---------------------------------------
        stage('Install Dependencies') {
            steps {
                echo "==> Installing dependencies with npm ci..."
                // npm ci (not npm install): installs exactly what package-lock.json
                // says, deletes node_modules first and fails if the lock file is out
                // of sync, so every build is reproducible.
                sh 'npm ci'
            }
        }

        // ---------------------------------------
        // CI enhancement #1: automated tests. A failing test fails the build.
        stage('Test') {
            steps {
                echo "==> Running Jest + Supertest test suite..."
                sh 'npm test'
            }
            post {
                success { echo "==> All tests passed." }
                failure { echo "==> Tests FAILED. Check the output above." }
                always  { echo "==> Test stage finished." }
            }
        }

        // ---------------------------------------
        // CI enhancement #2: versioned artifact named after the build number.
        stage('Build & Package') {
            steps {
                echo "==> Packaging application into ${ARTIFACT_DIR}/..."
                sh '''
                    rm -rf ${ARTIFACT_DIR} && mkdir -p ${ARTIFACT_DIR}
                    cp -r app.js server.js data package.json package-lock.json README.md ${ARTIFACT_DIR}/
                    tar -czf ${APP_NAME}-${BUILD_NUMBER}.tar.gz -C ${ARTIFACT_DIR} .
                    ls -lh ${APP_NAME}-${BUILD_NUMBER}.tar.gz
                '''
            }
        }

        // ---------------------------------------
        stage('Archive Artifacts') {
            steps {
                echo "==> Archiving build artifact..."
                archiveArtifacts artifacts: '*.tar.gz', fingerprint: true
            }
        }

        // ---------------------------------------
        // Optional: only runs if Docker exists on the agent. Never fails the build.
        stage('Docker Build (optional)') {
            steps {
                script {
                    if (sh(script: 'command -v docker', returnStatus: true) == 0) {
                        echo "==> Docker found — building image todo-api:${BUILD_NUMBER}..."
                        sh "docker build -t todo-api:${BUILD_NUMBER} -t todo-api:${env.IMAGE_TAG} -t todo-api:latest ."
                    } else {
                        echo "==> Docker not available on agent — skipping"
                    }
                }
            }
        }
    }

    // -------------------------------------------
    // Global post actions
    // -------------------------------------------
    post {
        always {
            echo "==> Pipeline finished with status: ${currentBuild.currentResult}"
            // cleanWs() needs the "Workspace Cleanup" plugin installed.
            cleanWs()
        }
        success  { echo "==> SUCCESS: ${APP_NAME} build #${BUILD_NUMBER} is ready." }
        failure  { echo "==> FAILURE: build #${BUILD_NUMBER} failed. See the console output." }
        unstable { echo "==> UNSTABLE: build #${BUILD_NUMBER} is unstable." }
    }
}
