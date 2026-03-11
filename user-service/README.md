# UniRide — user-service

Microsserviço de usuários. Gerencia cadastro, autenticação JWT e perfis de Motoristas e Passageiros.

## 🛠 Stack
- **Java 21** + Spring Boot 3.3
- Spring Security 6 + JWT (jjwt 0.12)
- Spring Data JPA
- **Dev/Testes:** H2 em memória (MODE=MySQL)
- **Produção:** MySQL 8 (AWS RDS)
- OpenFeign (comunicação futura entre microsserviços)

## 🚀 Como rodar localmente

```bash
# Perfil dev (H2) — padrão
mvn spring-boot:run

# H2 Console disponível em: http://localhost:8081/h2-console
# JDBC URL: jdbc:h2:mem:uniride_users
```

## 🏭 Produção (MySQL)

```bash
export SPRING_PROFILES_ACTIVE=prod
export DB_HOST=seu-rds-endpoint.amazonaws.com
export DB_NAME=uniride_users
export DB_USERNAME=admin
export DB_PASSWORD=sua_senha_segura
export JWT_SECRET=chave-secreta-256-bits-minimo

mvn spring-boot:run
```

## 📋 Endpoints

### Auth — `/api/v1/auth`
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/login` | ❌ | Login |
| POST | `/refresh` | ❌ | Renovar token |
| POST | `/logout` | ✅ | Logout |

### Participantes — `/api/v1/participantes`
| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| POST | `/motoristas` | ❌ | — | Cadastrar motorista |
| POST | `/passageiros` | ❌ | — | Cadastrar passageiro |
| GET | `/me` | ✅ | qualquer | Meu perfil |
| PUT | `/me` | ✅ | qualquer | Atualizar perfil |
| DELETE | `/me` | ✅ | qualquer | Desativar conta |
| POST | `/me/veiculo` | ✅ | MOTORISTA | Cadastrar veículo |
| GET | `/me/veiculo` | ✅ | MOTORISTA | Ver veículo |
| POST | `/me/enderecos` | ✅ | qualquer | Adicionar endereço |
| GET | `/me/enderecos` | ✅ | qualquer | Listar endereços |
| DELETE | `/me/enderecos/{id}` | ✅ | qualquer | Remover endereço |
| POST | `/me/telefones` | ✅ | qualquer | Adicionar telefone |
| GET | `/me/telefones` | ✅ | qualquer | Listar telefones |
| DELETE | `/me/telefones/{id}` | ✅ | qualquer | Remover telefone |
| GET | `/` | ✅ | ADMIN | Listar todos |
| GET | `/{id}` | ✅ | ADMIN | Buscar por ID |

### Instituições — `/api/v1/instituicoes`
| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| GET | `/` | ❌ | — | Listar todas |
| GET | `/{id}` | ❌ | — | Buscar por ID |
| POST | `/` | ✅ | ADMIN | Criar instituição |

## 🔒 Segurança
- BCrypt strength 12 nas senhas
- JWT 24h + Refresh Token 7 dias com rotação automática
- Rate limiting: 5 tentativas falhas em 15 min por email/IP
- Limpeza automática de tokens expirados (job às 2h)
- Nunca expõe senhaHash, stack trace ou mensagens específicas de auth

## 🌍 Variáveis de Ambiente (Produção)
| Variável | Descrição |
|----------|-----------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DB_HOST` | Host do MySQL (RDS) |
| `DB_PORT` | Porta (padrão: 3306) |
| `DB_NAME` | Nome do banco |
| `DB_USERNAME` | Usuário do banco |
| `DB_PASSWORD` | Senha do banco |
| `JWT_SECRET` | Chave JWT (mín. 256 bits) |
