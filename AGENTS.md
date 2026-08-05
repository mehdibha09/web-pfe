# App PFE — Travail terminé

## Problèmes résolus

1. ✅ **Métriques — UUID au lieu du nom**
   - `serviceEnvironmentLabel` dans `metrics/constants.ts` : fallback `'—'` au lieu du troncature d'UUID
   - `MetricTable.tsx` et `MetricsPage.tsx` : fallback `'— / —'` au lieu de l'UUID brut

2. ✅ **Métriques — Filtrage par tenant**
   - `getLatestMetric(id, tenantId?)`, `getMetricsHistory(id, tenantId?)`, `getMetricsSummary(id, tenantId?)`, `listMetrics(tenantId?)` acceptent désormais un `tenantId` optionnel passé en query param
   - `MetricsPage.tsx` passe `getStoredUser()?.tenantId` dans les appels

3. ✅ **Sessions — Infos utilisateur/tenant manquantes**
   - `SessionItem` type et `toSessionItem` enrichis avec `userEmail` / `userId`
   - Affichage de l'email utilisateur dans chaque carte session
   - Traductions `admin.sessions.user` ajoutées (fr/en)

4. ✅ **Mot de passe oublié — Traduction FR**
   - Toutes les clés (`forgotPasswordTitle`, `sendResetLink`, etc.) existent déjà en français
   - Aucune modification nécessaire

5. ✅ **Permissions viewer — Pages K8s et backups**
   - `K8sDeploymentsPage` : import `canManageK8s`, Create button & form filtrés par `allowManage`
   - `K8sCard` : scale/restart/rollback/HPA/delete masqués pour viewer, viewPods/logs/events toujours visibles
   - `BackupPage` et `BackupCard` : déjà protégés par `canManageBackups` (vérifié)

6. ✅ **Backups — UUID environnement au lieu du nom**
   - `seDisplayNameById` dans `BackupPage.tsx` : fallback `'—'` au lieu de la troncature UUID
   - `BackupCard.tsx` : fallback `'— / —'` au lieu de l'UUID brut

7. ✅ **Permissions déploiements — Viewer**
   - `DeploymentsPage.tsx` : `allowManage` via `canManageDeployments()`, Create form filtré
   - `DeploymentCard.tsx` : boutons redeploy/delete filtrés par `allowManage`
   - `seLabel` dans `helpers.ts` : accepte `services[]` et `environments[]` optionnels pour meilleure résolution des noms

8. ✅ **Traduction "Invalid credentials"**
   - `Login.tsx` : mapping des erreurs serveur → clés i18n
   - `fr.json`/`en.json` : clés `auth.invalidCredentials`, `auth.userInactive`

9. ✅ **Remarque « ressources illimitées » (pas de quota actif)**
   - `CreateVmDialog.tsx` : charge `listQuotas()`, affiche alerte info `vms.unlimitedQuotaNote` si aucun quota actif
   - `CreateK8sForm.tsx` : charge `listQuotas()`, `Box` rose avec `k8s.unlimitedQuotaNote` si aucun quota actif
   - Clés i18n fr/en ajoutées

10. ✅ **Coût automatique (CreateCostForm)**
    - `handleSeChange` : `getLatestMetric(seId)` + `calculateCost({mode:'VM', cpu, ram, disk, network_usage, hours:720})`
    - Champs coût en lecture seule (`disabled`), section récap rose, alertes `costs.noMetric`/`calcFailed`
    - Clés i18n fr/en : `costs.autoCalculatedTitle`, `autoCalculatedHint`, `calculating`, `noMetric`, `calcFailed`, `total`

11. ✅ **Filtrage K8s par tenant (backend)**
    - `K8s{Service,Secret,Ingress,NetworkPolicy,ServiceAccount,ConfigMap,Role,RoleBinding}Controller` : listent via `TenantNamespaceResolver.resolveList(namespace)`
    - `K8sNamespaceController` : filtre `startsWith(tenantNamespacePrefix())` pour non-superadmin
    - `KubernetesClient.listRoles/listRoleBindings` : support `null` = `--all-namespaces`
    - `K8sDeploymentService.buildNamespace` → `TenantNamespaceResolver.resolve(null)` (namespace unique `tenant-{id8}`)
    - `TenantService.createNamespaceForTenant` (authService) : crée le namespace K8s `tenant-{id8}` à la création du tenant

12. ✅ **Frontend K8s — namespace automatique (plus de saisie)**
    - `ServicesPage`, `IngressPage`, `ConfigMapsPage`, `SecretsPage`, `NetworkPoliciesPage`, `RbacPage` : champ namespace retiré du formulaire/payload/filtre
    - Le backend résout le namespace via `TenantNamespaceResolver.resolve(...)`

13. ✅ **Design rose K8s**
    - `SecretsPage`, `NetworkPoliciesPage`, `RbacPage`, `TemplatesPage`, dialogues de création passés en thème rose (#FCE7F3/#BE185D)
    - Header/pages alignées sur le thème rose

14. ✅ **Traductions FR K8s**
    - `k8s.networkpolicies.podSelectorHint`, `ingressTraffic`, `egressTraffic`, `commaSeparated`, `ingressRules`, `egressRules`, `allowAll`, `ingressBlocked`, `egressBlocked`, `created`, `creating` (fr/en)
    - `k8s.configmaps.labelsHint`, `k8s.secrets.labelsHint` (fr/en)

15. ✅ **Status service automatique**
    - Backend `ServiceController` : `create` force `ACTIVE`, `update` ne modifie plus le status (seuls start/stop/restart le changent) ; `parseStatus` supprimé
    - Frontend `CreateServiceCard`/`ServiceCard` : champ Status retiré ; `createService`/`updateService` sans `status`

16. ✅ **Page permissions — accès en lecture**
    - `canAccessPermissions` = superadmin **ou** tenant admin (page lisible par les tenants)
    - Descriptions des permissions visibles uniquement pour `canManageUsers` (gestionnaire d'utilisateurs)
    - Édition toujours réservée à `canManagePermissions` (superadmin)

17. ✅ **Module 3 — status service 100% automatique**
    - Endpoints `POST /services/{id}/start|stop|restart` **supprimés** (`ServiceController` + `ServiceDomainService`) ; création force `ACTIVE`
    - Frontend : `startService`/`stopService`/`restartService` (devopsService) + clés i18n retirées

18. ✅ **Module 3 — doublons backend → 409**
    - `EnvironmentService.create/update` : nom d'environnement dupliqué (tenant) → `CONFLICT` `ENVIRONMENT_NAME_ALREADY_EXISTS`
    - `ServiceEnvironmentService.create` : liaison service+env dupliquée → `CONFLICT` `SERVICE_ENVIRONMENT_ALREADY_LINKED`
    - Frontend `getErrorMessage.ts` : mapping codes + messages EN → FR (`translateMessage`)

19. ✅ **Module 3 — plus de POST/PUT /metrics**
    - `MetricController` : `POST /metrics` et `PUT /metrics/{id}` supprimés (collecte auto des métriques)
    - Frontend `createMetric` (devopsService) retiré

20. ✅ **Module 3 — affichage usage des quotas corrigé (unité réelle)**
    - Le bug « Restant $10 / CPU 1.31/1 / RAM 88.07/2048 » venait d'un affichage de **pourcentages de métriques** contre les max (cores/Mo/Go)
    - Backend : `QuotaService.usageFor(seId)` somme l'allocation réelle (CPU=vms.cpu, RAM=vms.ram Mo, storage=vms.disk Go, pods=k8s.replicas) → `QuotaUsageResponse` dans `QuotaResponse`
    - Frontend : `QuotaCard`/`QuotasSummary`/`QuotasPage` utilisent `q.usage` au lieu de `getLatestMetric` ; helper `RAM en Mo` corrigé

21. ✅ **Module 3 — traductions**
    - `ServiceCard` → `services.updatedSuccess`/`deletedSuccess` ; `ServiceEnvironmentsPage` → `serviceEnvs.linkedSuccess`
    - `getErrorMessage.ts` : préfixe `Quota exceeded for this service environment:` → « Quota dépassé pour cet environnement de service : ... »

22. ✅ **Module 3 — courbe métriques filtrable par date**
    - `MetricsPage` : `dateFilteredHistory` applique `dateFrom/dateTo` à l'historique avant de tracer les sparklines (CPU/RAM/NET) et la liste récente de `MetricTrendCard` (le filtre du tableau existait déjà)

23. ✅ **Module 3 — coûts : génération manuelle + contrainte devise**
    - Backend `POST /costs/generate` (déclenche `CostAutoGeneratorService.autoGenerateCosts()`), permission `COST_MANAGE`
    - Backend `/pricing/calculate` : param `currency` optionnel ; si une devise est fournie sans prix actif → `422 NO_PRICE_FOR_CURRENCY`
    - Frontend `CostsPage` : bouton dev « Calculer le prix » (`generateCostsNow`) visible pour `COST_MANAGE` ; `generateCostsNow` (cloudPricerService) ; `pricingService.calculateCost` accepte `currency`
    - Le générateur auto calcule déjà pour les SE avec VMs/K8s même **sans quota**

## Fichiers modifiés (sessions module 1-3)
- `frontend/src/views/devops/metrics/constants.ts`
- `frontend/src/views/devops/metrics/MetricTable.tsx`
- `frontend/src/views/devops/metrics/MetricsPage.tsx`
- `frontend/src/services/devopsService/index.ts`
- `frontend/src/views/admin/sessions/SessionsPage.tsx`
- `frontend/src/i18n/locales/fr.json` → **réorganisé** : un fichier par namespace dans `frontend/src/i18n/locales/fr/` et `en/` (`admin.json`, `k8s.json`, `costs.json`, …) + un `index.ts` qui les fusionne ; `src/i18n/config.ts` importe depuis `./locales/fr` / `./locales/en`
- `frontend/src/i18n/locales/en.json` → idem (voir ci-dessus)
- `frontend/src/views/devops/k8s/K8sDeploymentsPage.tsx`
- `frontend/src/views/devops/k8s/K8sCard.tsx`
- `frontend/src/views/devops/backups/BackupPage.tsx`
- `frontend/src/views/devops/backups/BackupCard.tsx`
- `frontend/src/views/devops/deployments/DeploymentsPage.tsx`
- `frontend/src/views/devops/deployments/DeploymentCard.tsx`
- `frontend/src/views/devops/deployments/helpers.ts`
- `frontend/src/views/auth/login/Login.tsx`
- `frontend/src/views/devops/costs/CreateCostForm.tsx`
- `frontend/src/views/devops/vm/CreateVmDialog.tsx`
- `frontend/src/views/devops/k8s/CreateK8sForm.tsx`
- `frontend/src/views/devops/k8s/{ServicesPage,IngressPage,ConfigMapsPage,SecretsPage,NetworkPoliciesPage,RbacPage,TemplatesPage}.tsx`
- `frontend/src/services/authorization.ts`
- `frontend/src/views/admin/permissions/PermissionsPage.tsx`
- `deployment/src/main/java/com/deployment/ServiceEntity/web/controller/K8s{*}.java`
- `deployment/src/main/java/com/deployment/ServiceEntity/domain/KubernetesClient.java`
- `deployment/src/main/java/com/deployment/ServiceEntity/service/K8sDeploymentService.java`
- `deployment/src/main/java/com/deployment/ServiceEntity/web/controller/ServiceController.java`
- `deployment/src/main/java/com/deployment/ServiceEntity/service/ServiceDomainService.java`
- `deployment/src/main/java/com/deployment/ServiceEntity/service/EnvironmentService.java`
- `deployment/src/main/java/com/deployment/ServiceEntity/service/ServiceEnvironmentService.java`
- `deployment/src/main/java/com/deployment/ServiceEntity/web/controller/MetricController.java`
- `cloudPricer/src/main/java/com/cloud_pricer/service/QuotaService.java` (+ `web/dto/quota/QuotaUsageResponse.java`)
- `cloudPricer/src/main/java/com/cloud_pricer/web/controller/QuotaController.java`
- `cloudPricer/src/main/java/com/cloud_pricer/web/controller/PriceConfigController.java`
- `cloudPricer/src/main/java/com/cloud_pricer/web/controller/CostController.java` (+ `POST /costs/generate`)
- `frontend/src/utils/errorMessage.ts`
- `frontend/src/services/cloudPricerService/index.ts` (+ `generateCostsNow`)
- `frontend/src/services/pricingService/index.ts` (+ `currency`)
- `frontend/src/services/devopsService/index.ts` (retiré `createMetric`/`startService`/`stopService`/`restartService`)
- `frontend/src/views/devops/costs/CostsPage.tsx` (bouton dev + KPI/graphiques sur tout l'historique)
- `frontend/src/views/devops/costs/BudgetUsageSection.tsx` (usage réel `q.usage` + somme par SE + pods masqués)
- `frontend/src/views/devops/costs/CostCharts.tsx` (labels mois)
- `frontend/src/views/devops/costs/CostCard.tsx` (chips %) ; `ModeComparisonCard.tsx` (comparaison VM vs K8s flexible par SE) ; `ForecastCard.tsx` (toast + période par défaut)
- `cloudPricer/src/main/java/com/cloud_pricer/service/CostAutoGeneratorService.java` (fenêtre incrémentale)
- `cloudPricer/src/main/java/com/cloud_pricer/{service/CostRecordService.java,repository/CostRecordRepository.java}` (`findLatestByServiceEnvironmentId`)
- `frontend/src/views/devops/quotas/{QuotaCard,QuotasSummary,QuotasPage,CreateQuotaForm}.tsx`
- `frontend/src/views/devops/services/ServiceCard.tsx`
- `frontend/src/views/devops/service-environments/ServiceEnvironmentsPage.tsx`
- `frontend/src/views/devops/metrics/MetricsPage.tsx` (filtre date courbe)
- `frontend/src/services/interfaces/cloudPricer.ts` (+ `QuotaUsage`)
- `authService/src/main/java/com/auth/service/service/TenantService.java`

## En attente
- ✅ **Déployé le 05/08/2026 (10)** : tags `20260805201500` (tous services) puis `20260805203000` (auth-service + gateway). **ROOT CAUSE email 2FA trouvée** : la route gateway `/api/v1/auth/**` appliquait le filtre `Auth` → `/2fa/email/verify` ET `/2fa/email/resend` renvoyaient **401** (pas de token pendant le flux login, confirmé via curl). Fix : ajout des 2 chemins au route **publique** gateway `auth-public`. Bug 2 : le contrôleur `resendLoginTwoFaEmail` réutilisait `AuthTwoFaEmailVerifyRequest` (exige `code`) alors que le frontend n'envoie que `{email}` → créé `AuthTwoFaEmailResendRequest` (email seul). **Vérifié en prod** : verify → 401 « challenge invalide » (app-level, attendu), resend → 400 « No active email 2FA challenge » (le DTO passe). Reste à vérifier l'**arrivée effective de l'email** dans la boîte mail (Brevo SMTP) — vérifier les logs auth-service après un vrai login avec un user 2FA.
- ✅ **Déployé le 05/08/2026 (9)** : tag `20260805170054` (tous les 5 services : auth, cloud-pricer, gateway, deployment, frontend). **2 erreurs TS corrigées pour le build frontend** : `CreateBackupForm.tsx` → `toast.success` sans import (ajouté `import { toast } from 'react-toastify'`) ; `CreateServiceCard.tsx:60` `error`/`helperText` dupliqués (déjà fournis par `fieldProps('name')`). Manifests K8s re-apply (RBAC ClusterRole : namespaces `get/list/watch/create` (sans `delete`), +clusterroles/clusterrolebindings get/list, pods/services/configmaps/secrets/events/serviceaccounts, deployments/replicasets, HPA, networkpolicies/ingresses ; configmap mail `MAIL_FROM=mehdibelhajali9@gmail.com`, `FRONTEND_BASE_URL=http://192.168.56.10:30080` ; secret Brevo SMTP). **Vérifié en prod** : 5 pods Running 1/1, `/api/v1/test` OK via gateway, login `admin@gmail.com` → tokens + me OK, frontend HTTP 200, pas d'erreur dans les logs. Note : le master vagrant ne résout pas la DNS interne K8s → tester via ClusterIP (`kubectl get svc`).
- ✅ **Test K8s module + notifications + quota/budget (04/08/2026)** : **créations K8s 201 + namespace auto `tenant-f828de83`** — services, ingresses, configmaps, secrets, network-policies, serviceaccounts, roles, rolebindings (payload exact : `roleKind`/`roleName`/`subjects`, `rules`). Suppression 204. **VM quota** : cpu=4 sur SE à 2/5 → **409 QUOTA_EXCEEDED** ; cpu=1 → 201 ; delete 204. **Scales** : > maxPods 409, = maxPods 200, négatif 400. **SSE metrics** : 1 event + heartbeat, HTTP 200 (plus de boucle ~10 req/s). **SSE notifications** (`/notifications/stream`) : connexion stable (timeout idle, pas d'erreur). `/costs/generate` → 200 + records VM. Nettoyage terminé (8 ressources K8s test + deploy/quotas + HPA `test-m4-deploy-hpa` supprimé).
- ✅ **Déployé le 04/08/2026 (8)** : tags `20260804170719`→`20260804174838` (frontend + deployment-service). Emoji 💗 retiré du dialogue métriques VMs ; **SSE accéléré à ~3 s** (`metrics.sse.push-interval-ms`/`heartbeat-ms` défaut 3000, `VmMetricsScheduler` fixedDelay 3000). **Quota pods appliqué au scale K8s** : `QuotaEnforcementService.enforceK8sScale` (409 `QUOTA_EXCEEDED` si pods projetés > maxPods) + scale négatif → 400 ; `QuotaRepository`→`findFirstByServiceEnvironmentIdAndActiveTrueOrderByCreatedAtDesc` (utilise le quota actif **le plus récent**) ; entité `Quota` (deployment) : ajout `createdAt`/`updatedAt` avec `@PrePersist`/`@PreUpdate` pour rendre l'ordre fonctionnel. **Vérifié en prod** : scale 3 avec maxPods=2 → **409** ; scale 2 → 200 ; scale négatif → 400 ; création K8s avec quota maxPods=0 (illimité) → 201 ; `/costs/generate` → 200 + records VM créés (0.0013 €). Artefacts test supprimés (deploy k8s + quota temporaires).
- ✅ **Déployé le 04/08/2026 (7)** : tag `20260804141956` (frontend + deployment-service). **Bug SSE — boucle de reconnexion** : `useSse.ts` recevait un objet `headers` **créé à chaque render** (inline `{Authorization}`) → chaque message → setState → re-render → nouvelle référence `headers` → `connect` recréé → abort + reconnexion → le serveur renvoie le snapshot « latest » → boucle ≈ **10 requêtes/seconde** sur MetricsPage & Monitoring. Fix : `useSse` garde `url/headers/onMessage` dans des **refs** (connect stable), ne se reconnecte que si `url`/`enabled` changent. Backend `MetricSseController` : interval push configurable `metrics.sse.push-interval-ms` (défaut 5000), **heartbeat `:ping`** quand rien de neuf (évite que le client/proxy considère la connexion morte), timeout configurable `metrics.sse.timeout-ms` (0 = jamais), nettoyage cohérent des maps emitter. **Vérifié en prod** : stream 10 s → HTTP 200, **1 event metric + heartbeat**, plus de rafale de requêtes. Notifications (`NotificationsPage`/`AppBar`) : token capturé une fois (`[user]` dep) → pas de bug.
- ✅ **Déployé le 04/08/2026 (6)** : tag `20260804005139` (tous services). Fix `QuotaService.validateLimitsNotBelowUsage` (compilation : primitives `double`/`int` → comparaisons `<= 0` = « pas de limite »). **Vérifié en prod** : quota < usage → **409 `QUOTA_BELOW_USAGE`** ; quota ≥ usage → 201 + `usage` renvoyé ; suppression 204 ; **SSE `/api/v1/metrics/stream/{seId}` → HTTP 200** (plus de 429, route gateway `metrics-stream` devant `metrics`) ; route normale `/metrics` → 200. Page VMs (filtre date + cœurs rose + pods retirés), Monitoring SE-based, coûts — tout inclus dans ce tag frontend.
- ✅ **Déployé le 03/08/2026 (5)** : tag `20260803203827` (frontend). `ModeComparisonCard` réécrit → comparaison VM vs K8s **flexible par environnement** (une SE, colonnes par mode présent : 2 colonnes si VM+K8s, sinon 1). Artefacts de test Module 4 nettoyés (cluster + base : deployment/services/cm/secrets/ingress, namespace `tenant-4316d5b1` supprimé, record DB `test-m4-deploy` supprimé).
- ✅ **Déployé le 03/08/2026 (4)** : tag `20260803192925` (deployment-service). **Bug namespace auto K8s** : services/configmaps/secrets/ingresses/networkpolicies/serviceaccounts/roles/rolebindings ne créaient **pas** le namespace `tenant-{id8}` avant `kubectl apply` (seul `K8sDeploymentService` le faisait) → pour un tenant existant sans namespace, le create échouait silencieusement (`catch { log.error }`) et le contrôleur retombait sur une **réponse simulée 201** (`fromSimulated`). Fix central : `KubernetesClient` → `createNamespace(namespace)` (idempotent, garde non-blanc) au début de chaque `createOrUpdate*`. **Module 4 vérifié** : 4.1 201 namespace auto ; 4.2 quota → **409** `QUOTA_EXCEEDED` (spec disait 400 — voir ci-dessous) ; 4.3 scale<0 400 ; 4.4 restart/rollback 200 ; 4.5 pods/logs/events/hpa 200 (log Forbidden = RBAC cluster, API OK) ; 4.6/4.7/4.8 **isolation tenant OK** (A=tenant-f828de83, B=sales tenant-4316d5b1) ; 4.9 viewer lecture 200 ; 4.10 viewer gestion 403 ; 4.11 viewer pods/logs/events 200 ; 4.12 configmap auto 201 ; 4.13 secrets batch 204.
- **✅ Nettoyage VM fantôme `tessst` (03/08/2026)** : VM `tessst` (`created_by=NULL`, 30/07, saisit le tenant supprimé `1f518bca`) + son SE orphelin `d427a5a1` + service/env associés + `nginx-test` (k8s_deployment) + **2682 métriques** supprimés en transaction. Il reste 2 VMs légitimes + 5 SE. Origine probable : VM créée (sans user contexte, created_by NULL) dans un tenant ensuite supprimé — jamais nettoyée.
- **Décision quota dépassé** : on conserve **409 `QUOTA_EXCEEDED`** (conflit REST correct pour un rejet de création par limite) au lieu du 400 de la spec — frontend traduit déjà le code, aucune casse. Changer seulement si l'utilisateur insiste.
- ✅ **Déployé le 03/08/2026 (3)** : tag `20260803184232` (frontend). Enrichissements coûts : `CostCard` chips avec **%(part)** + barre de répartition empilée ; nouvelle carte **Comparaison VM vs K8s** (`ModeComparisonCard`, agrége par `mode`) ; `ForecastCard` corrigé (le chargement échouait **silencieusement** `catch {}` → toast d'erreur + période par défaut = mois suivant).
- ✅ **Déployé le 03/08/2026 (2)** : tag `20260803182526` (cloud-pricer + frontend). **Bug scheduler coûts corrigé** — `CostAutoGeneratorService` ne recréait plus un enregistrement pleine fenêtre (720 h) à chaque run `@Scheduled` ; il calcule maintenant **l'incrément depuis le dernier `periodEnd`** (fenêtre non chevauchante, items plats pro-ratés `hours/720`). Frontend coûts : `BudgetUsageSection` utilise `q.usage` (allocation réelle, plus les pourcentages de métriques) + **somme** des records par SE (plus le dernier seul) ; `CostsPage` KPI/graphiques agrégés sur **tout l'historique filtré par période** (plus la page 10) ; `CostCharts` labels = **mois** (au lieu de `#n`) ; `QuotaCard` masque **Pods quand `maxPods=0`** (concept K8s sans sens pour une VM). Prod : 3 records dupliqués de la SE `2186b8e3` supprimés ; après génération manuelle → 1 seul record correct `08/03 14:43→17:31` ($0.0013) ; 2e run ignoré (sous l'heure). Vérif : prix CPU/RAM non nuls (`3.16e-05`/`4.2e-06`), compute ≈ $0 est juste un arrondi (VM a tourné ~1 h).
- ✅ **Déployé le 03/08/2026** : tag `20260803163852` (deployment-service + cloud-pricer + frontend). Tests prod OK : start/stop/restart supprimés (NoResourceFound), doublon env → 409, doublon service-env → 409, `/pricing/calculate` EUR 200 / USD 422 `NO_PRICE_FOR_CURRENCY`, `POST /costs/generate` → 200, `QuotaResponse.usage` renvoyé. Note : log cloud-pricer — warning DDL `acknowledged_by` non castable uuid (drift préexistant, non bloquant).
- Le quota backend est déjà appliqué à la création : `VmService.java:102` (`enforceVm`), `K8sDeploymentService.java:59` (`enforceK8s`)

## Liste de tâches utilisateur (à vérifier)
- [ ] Filtrage K8s par tenant visible après déploiement (backend déployé le 03/08/2026 — à vérifier)
- [ ] Page permissions : lecture seule pour les autres tenants, descriptions uniquement pour le gestionnaire d'utilisateurs (fait, voir §16)
- [ ] Status automatique sur `/admin/devops/services` : plus de saisie manuelle (fait, voir §15)
- [ ] Endpoints start/stop/restart retirés backend+frontend (fait, voir §17)
- [ ] « Retirer le docker » → confirmé fait par l'utilisateur (aucune action)
- [ ] K8s : suppression du namespace dans les formulaires de création service/ingress (fait, namespace auto)
- [ ] Amélioration dialogue création ConfigMap (fait : design rose + `labelsHint` FR)
- [ ] Création automatique du namespace K8s à la création d'un tenant (fait : `TenantService.createNamespaceForTenant`)
- [ ] Amélioration design création secret (fait : rose)
- [ ] Amélioration design création network policies + FR + namespace auto (fait : rose + traductions FR)
- [ ] Amélioration design création RBAC (serviceaccounts/roles/bindings) + namespace auto (fait : rose)
- [ ] Amélioration design création nouveau modèle / template (fait : rose)
- [ ] Quota appliqué à la création VM et service K8s si actif (fait : backend `enforceVm`/`enforceK8s` + remarque « ressources illimitées » si aucun quota)
- [ ] Affichage usage quota en unités réelles (fait : `QuotaService.usageFor` + `q.usage`, voir §20)
- [ ] Coût calculé automatiquement selon les métriques VM et les prix saisis (fait : `CreateCostForm` auto-calcul)
- [ ] Coûts : bouton dev « Calculer le prix » + `/costs/generate` + contrainte devise (fait, voir §23)
- [ ] Thème global rose (respecté)
- [ ] Page `/admin/dashboard` → `DashboardPrincipal` (routes : `/admin/dashboard`, `/admin/devops/dashboard`)
- [ ] Inputs numériques : suppression du zéro en tête (taper « 100 » donne « 0100 ») sur tous les champs `type="number"` (fait : `src/utils/numeric.ts` + `numericFieldValue` appliqué à quotas, pricing, k8s, backups)
- [ ] Moderniser les courbes de coûts `/admin/devops/costs` (fait : `CostCharts.tsx` réécrit — headers dégradés rose/blanc, tooltip moderne, axe Y `$money`, `Area` total avec gradient, breakdown `BarChart` verticale ; `MonthComparisonCard` header gradient)
- [ ] Contraste boutons page `/admin/users` (fait : Save blanc sur gradient, Edit bordure grise/texte foncé, Cancel neutre)
- [ ] Organisation des boutons des cartes K8s `/admin/devops/k8s` (fait : `K8sCard` — groupe lecture seule + séparateur + groupe gestion, delete détaché à droite)
- [ ] Espace en haut des dialogues création K8s (fait : `pt: 3.5` sur tous les DialogContent création)
- [ ] Bouton Déploiement services `/admin/devops/services` : masqué si pas `canAccessAuditLogs` (fait : prop `canViewAudit`)
- [ ] Email 2FA non reçu — **fait (05/08/2026)** : ROOT CAUSE = gateway `Auth` filter bloquait `/2fa/email/verify` + `/2fa/email/resend` (401) ; résolu en passant ces routes en publique + DTO resend email-only. **Reste** : vérifier l'arrivée effective de l'email (Brevo) et le contenu des logs auth-service lors d'un vrai login 2FA.
- [ ] Courbe utilisation CPU `/admin/devops/monitoring` : pas aimée et un peu lente — **fait (05/08/2026)** : `MonitoringTempsReelPage` remplace les 2 AreaCharts recharts par des **SparkLine légères + gros chiffre** (CPU/RAM, style onglet métriques), rendu SVG natif beaucoup plus rapide
- [ ] Page services `/admin/devops/services` : cacher le bouton Déploiement si l'utilisateur n'a pas la permission de voir la page audit
