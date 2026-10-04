import { type RouteConfig, layout, route } from "@react-router/dev/routes";

export default [    
    route("", "routes/welcome.tsx"),  
    route("login", "routes/auth/login.tsx"),
    route("register", "routes/auth/register.tsx"),

    layout("components/layouts/AuthLayout.tsx", [
        route("overview", "routes/overview.tsx"),
        route("channel/:id", "routes/channel.tsx"),
        route(":handle", "routes/shared.tsx"),
    ]),
] satisfies RouteConfig;
