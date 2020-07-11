# Ortoo

> Actor Model library for JavaScript environments

> **THIS LIBRARY STILL IN EARLY DEVELOPMENT, IT'S NOT STABLE, AND USAGE IN PRODUCTION IS NOT RECOMMENDED YET.**

Methods: done

- spawn
- link
- become
- unbecome
- send/tell
- ask

Built-in Messages types:

- spawn : create new actor
- start : run start handler
- started : reply to spawn when start is done

- stop : run stop handler and destroy actor
- stopped : notify linked actors when stop done

- restart : clean up actor state
- restarted : notify linked actors when restart is done

- reply : reply ask messages

- info : get actor status, state, data

- crash : notify linked actors when actor crash

- terminate : destroy actor
- died : notify linked actors when termination is done

Components

- Actor
- ActorSystem

Support:
Node
Deno
Browser
