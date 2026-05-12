# UniRide

Plataforma de compartilhamento de caronas universitárias. Conecta estudantes que percorrem trajetos semelhantes, permitindo que motoristas criem rotinas de caronas e passageiros solicitem vagas com base em proximidade e preferências de viagem.

---

## Repositório

O código-fonte completo está disponível em:

```
https://github.com/HubDoVandinho/UniRide.git
```

Para clonar o projeto:

```bash
git clone https://github.com/HubDoVandinho/UniRide.git
cd UniRide
```

---

## Arquitetura

O sistema é composto por quatro microsserviços backend e um aplicativo mobile:

```
┌─────────────────────────────────────────────────┐
│           App Mobile (React Native/Expo)         │
│               porta 8085 (dev)                   │
└────────────────────┬────────────────────────────┘
                     │ HTTP (EXPO_PUBLIC_API_URL)
                     ▼
┌─────────────────────────────────────────────────┐
│         gateway-service  :8080                   │
│    Roteamento centralizado + validação JWT        │
└──────────┬──────────┬─────────────┬─────────────┘
           │          │             │
    ┌──────▼──┐ ┌─────▼────┐ ┌─────▼──────┐
    │  user-  │ │institu-  │ │   ride-    │
    │ service │ │tion-svc  │ │  service   │
    │  :8081  │ │  :8082   │ │   :8083    │
    └──────┬──┘ └─────┬────┘ └─────┬──────┘
           └──────────┴─────────────┘
                       │
         ┌─────────────▼────────────┐
         │  H2 (dev) / MySQL (prod) │
         └──────────────────────────┘
```

| Serviço | Responsabilidade | Porta |
|---|---|---|
| `gateway-service` | Roteamento e autenticação JWT centralizada | 8080 |
| `user-service` | Participantes, veículos, endereços, amizades, preferências, denúncias | 8081 |
| `institution-service` | Cadastro de instituições de ensino, integração e-MEC | 8082 |
| `ride-service` | Rotinas, caronas, solicitações, avaliações, chat, pagamento PIX | 8083 |
| `mobile-backup` | Aplicativo Android/iOS (React Native + Expo) | 8085 |

---

## Pré-requisitos

Instale os softwares abaixo antes de configurar o projeto.

### Backend

| Software | Versão mínima | Download |
|---|---|---|
| Java (JDK) | 21 | https://adoptium.net |
| Apache Maven | 3.9+ | https://maven.apache.org/download.cgi |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/mysql/ (apenas produção) |

> Em ambiente de desenvolvimento os serviços utilizam banco H2 em memória — não é necessário instalar o MySQL para rodar localmente.

### Mobile

| Software | Versão mínima | Download |
|---|---|---|
| Node.js | 18 LTS | https://nodejs.org |
| npm | 9+ | Incluído com o Node.js |
| Expo CLI | — | Instalado via npm (ver abaixo) |
| Expo Go (app) | — | Google Play / App Store |

---

## Instalação e Configuração

### 1. Variáveis de ambiente — Backend

Cada serviço lê suas configurações de variáveis de ambiente quando executado com o perfil `prod`. Em desenvolvimento o perfil padrão usa H2 e valores hardcoded seguros.

Crie um arquivo `.env` (não commitado) ou configure as variáveis no sistema operacional:

```bash
# Segredo JWT — mínimo 256 bits, igual em todos os serviços
JWT_SECRET=chave-secreta-longa-minimo-256-bits

# Banco de dados (apenas perfil prod)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=uniride
DB_PASSWORD=sua_senha

# E-mail (Gmail com senha de app)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=senha-de-app-google

# URLs inter-serviços (padrão já definido em application.yml)
USER_SERVICE_URL=http://localhost:8081
INSTITUTION_SERVICE_URL=http://localhost:8082
RIDE_SERVICE_URL=http://localhost:8083

# URL pública do gateway (usada em links de e-mail)
APP_URL=http://localhost:8080
```

### 2. Compilar e executar os serviços backend

Execute cada serviço em um terminal separado, **na ordem abaixo** (o gateway depende dos demais estarem no ar):

```bash
# 1. institution-service
cd institution-service
mvn spring-boot:run

# 2. user-service
cd user-service
mvn spring-boot:run

# 3. ride-service
cd ride-service
mvn spring-boot:run

# 4. gateway-service (iniciar por último)
cd gateway-service
mvn spring-boot:run
```

Para ativar o perfil de produção (MySQL):

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

Verificar se os serviços estão no ar:

```bash
curl http://localhost:8080/actuator/health   # gateway
curl http://localhost:8081/actuator/health   # user-service
curl http://localhost:8082/actuator/health   # institution-service
curl http://localhost:8083/actuator/health   # ride-service
```

### 3. Banco de dados — Produção (MySQL)

Crie os três bancos de dados antes de subir os serviços com perfil `prod`:

```sql
CREATE DATABASE uniride_users     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE uniride_institutions CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE uniride_rides     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

O Hibernate cria as tabelas automaticamente na primeira execução (`ddl-auto: validate` em prod — requer que as tabelas já existam; use `create` na primeira vez e depois reverta para `validate`).

### 4. Firewall (Windows — rede local)

Para testes com dispositivo físico na mesma rede Wi-Fi, abra as portas no firewall. Um script PowerShell está disponível na raiz do projeto:

```powershell
# Executar como Administrador
.\firewall-uniride.ps1
```

O script abre as portas 8080–8083 para conexões de entrada.

### 5. Aplicativo Mobile

```bash
cd mobile-backup

# Instalar dependências
npm install

# Configurar a URL do gateway
# Edite o arquivo .env (crie se não existir):
#   EXPO_PUBLIC_API_URL=http://<IP_DA_MÁQUINA>:8080
#
# Ou use o script automatizado na raiz do projeto:
cd ..
.\set-dev-ip.ps1          # detecta o IP Wi-Fi automaticamente
# OU
.\set-dev-ip.ps1 -IP 192.168.1.2   # informar IP manualmente

cd mobile-backup

# Iniciar o servidor de desenvolvimento
npx expo start --clear
```

Escaneie o QR Code exibido no terminal com o aplicativo **Expo Go** instalado no dispositivo.

> **Emulador Android:** substitua o IP pelo endereço `http://10.0.2.2:8080`  
> **Simulador iOS:** use `http://localhost:8080`

#### Gerar APK (build de preview)

```bash
# Requer conta Expo e EAS CLI instalado
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

---

## Atualizar o IP de desenvolvimento

Ao trocar de rede Wi-Fi, o IP da máquina muda. Execute o script na raiz do projeto para atualizar todos os arquivos de uma vez:

```powershell
.\set-dev-ip.ps1
```

Arquivos atualizados automaticamente:
- `mobile-backup/.env`
- `mobile-backup/eas.json`
- `user-service/src/main/resources/application.yml`
- `user-service/src/main/resources/application-dev.yml`

Após a atualização: reinicie o `user-service` e execute `npx expo start --clear` no mobile.

---

## Consoles de desenvolvimento (perfil dev)

| Console | URL |
|---|---|
| H2 — user-service | http://localhost:8081/h2-console |
| H2 — institution-service | http://localhost:8082/h2-console |
| H2 — ride-service | http://localhost:8083/h2-console |

Credenciais H2 (padrão):
- **JDBC URL:** conforme o perfil ativo (ex: `jdbc:h2:mem:uniride_users`)
- **Usuário:** `sa`
- **Senha:** *(em branco)*

---

## Informações adicionais

### Autenticação

O sistema utiliza **JWT** com dois tokens:

| Token | Validade |
|---|---|
| Access token | 24 horas |
| Refresh token | 7 dias |

O gateway valida o token em todas as requisições antes de repassá-las aos microsserviços. Rotas públicas (login, cadastro, recuperação de senha) são liberadas sem autenticação.

### Notificações Push

O serviço de push usa a **Expo Push API** com tokens FCM. Para funcionar em produção:
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Adicione o arquivo `google-services.json` em `mobile-backup/android/app/`
3. Configure o `FCM Server Key` na conta Expo do projeto

### Redes com isolamento de AP

Em redes universitárias ou corporativas que bloqueiam comunicação entre dispositivos (AP Isolation), o dispositivo móvel não consegue alcançar a máquina de desenvolvimento diretamente. Solução:

```bash
# Instalar ngrok
npm install -g ngrok

# Expor o gateway publicamente
ngrok http 8080
```

Atualize `EXPO_PUBLIC_API_URL` com a URL gerada pelo ngrok e gere um novo build do APK.

### Monitoramento

Todos os serviços expõem o endpoint `/actuator/health` via Spring Boot Actuator. Em produção, recomenda-se configurar uma ferramenta de monitoramento (ex: UptimeRobot, AWS CloudWatch) apontando para esses endpoints.

Logs são gravados no nível `INFO` em produção e `DEBUG` em desenvolvimento. Para verificar logs em tempo real:

```bash
# Redirecionar saída para arquivo
mvn spring-boot:run > logs/user-service.log 2>&1
```

### Backup do banco de dados (Produção)

```bash
# Exportar todos os bancos
mysqldump -u uniride -p uniride_users        > backup_users_$(date +%Y%m%d).sql
mysqldump -u uniride -p uniride_institutions > backup_institutions_$(date +%Y%m%d).sql
mysqldump -u uniride -p uniride_rides        > backup_rides_$(date +%Y%m%d).sql

# Restaurar
mysql -u uniride -p uniride_users < backup_users_20260512.sql
```

Recomenda-se automatizar o backup diário via cron (Linux) ou Agendador de Tarefas (Windows), e armazenar os arquivos em local externo (ex: AWS S3, Google Drive).

### Rate Limiting

O `user-service` possui proteção contra tentativas excessivas de login:
- **Máximo:** 5 tentativas por janela de 15 minutos por IP
- Após atingir o limite, o acesso é bloqueado temporariamente

### Tecnologias utilizadas

**Backend**

| Tecnologia | Versão | Uso |
|---|---|---|
| Java | 21 | Linguagem principal |
| Spring Boot | 3.3.0 | Framework backend |
| Spring Cloud Gateway | 2023.0.1 | API Gateway |
| Spring Security + JWT (JJWT) | 0.12.5 | Autenticação |
| Spring Data JPA + Hibernate | — | ORM e acesso a dados |
| OpenFeign | 2023.0.1 | Comunicação inter-serviços |
| MySQL | 8.0+ | Banco de dados (produção) |
| H2 | — | Banco em memória (desenvolvimento) |
| Lombok | 1.18.38 | Redução de boilerplate |

**Mobile**

| Tecnologia | Versão | Uso |
|---|---|---|
| React Native | 0.81.5 | Framework mobile |
| Expo | 54.0.34 | Toolchain e build |
| Expo Router | 6.0.23 | Navegação baseada em arquivos |
| TypeScript | 5.9.2 | Tipagem estática |
| Zustand | 5.0.0 | Gerenciamento de estado |
| Axios | 1.7.0 | Cliente HTTP |
| React Hook Form + Zod | 7.54 / 3.23 | Formulários e validação |
| Expo Notifications | 0.32.16 | Push notifications |
| Expo Location | 19.0.8 | GPS e geolocalização |
