-- acme-http01.lua for HAProxy
-- Source: https://github.com/janeczku/haproxy-acme-validation-plugin

core.register_action("lets-encrypt", { "http-req" }, function(txn)
    local uri = txn.sf:path()
    local token = uri:match("/.well%-known/acme%-challenge/([a-zA-Z0-9_%-]+)")

    if token then
        local file = io.open("/etc/ssl/certs/acme/" .. token, "r")
        if file then
            local content = file:read("*a")
            file:close()
            txn:set_var("txn.acme_response", content)
            txn:set_var("txn.acme_token", token)
            txn.res:set_headers({
                ["content-type"] = "text/plain",
                ["content-length"] = #content
            })
            txn.res:send(content)
            return
        end
    end
    txn:set_var("txn.acme_response", "")
end)
