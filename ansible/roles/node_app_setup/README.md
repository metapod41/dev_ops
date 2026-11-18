node_app_setup
==============

Installs Node.js 18 (NodeSource), copies the todo-api source to `app_dir`,
installs production dependencies, and runs the app as a systemd service.
At the end it checks `GET /health`.

Requirements
------------
A Debian/Ubuntu target with systemd and sudo (`become`).

Role Variables
--------------
| Variable | Default | Purpose |
|---|---|---|
| `app_port` | `3000` | Port the API listens on |
| `app_name` | `todo-api` | systemd service name |
| `app_user` | `nodeapp` | System user that runs the app |
| `app_dir` | `/opt/todo-api` | Install directory |
| `node_major_version` | `18` | NodeSource major version |
| `artifact_src` | `{{ playbook_dir }}/../` | Where to copy the app source from |

Example Playbook
----------------
```yaml
- hosts: app_servers
  become: yes
  roles:
    - node_app_setup
```

Folder skeleton follows `ansible-galaxy init node_app_setup` (created by hand
because ansible-galaxy wasn't installed on the Windows machine; empty
`files/` and `tests/` folders were removed).
