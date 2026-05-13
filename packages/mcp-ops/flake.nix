{
  description = "sho-mcp-ops — ops sandbox OCI image (holds tokens, runs MCP servers)";

  # nixpkgs は dev sandbox (../../flake.nix) とは独立 pin。
  # ops 側は minimal + stable で長期固定したいので、dev の bump に巻き込まれない
  # よう flake.lock を分離している。両者を同期したい時は手動で url を揃える。
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      mkOpsImage = pkgs: pkgs.dockerTools.buildLayeredImage {
        name = "sho-mcp-ops";
        tag  = "latest";

        # ops は token を持って MCP server を expose するだけのコンテナ。
        # CLI を生やさず、uvx 経由で公式 MCP server (awslabs.cloudwatch-mcp-server)
        # と stdio→SSE adapter (mcp-proxy) を実行する最小セットだけ持つ。
        # github-mcp-server は release tarball を curl で落として使う想定。
        contents = with pkgs; [
          bashInteractive
          coreutils
          curl
          cacert
          tzdata
          # gnutar + gzip: start.sh が github-mcp-server の release tarball を
          # `tar -xz` で展開する。coreutils には tar が入ってないのでここで足す。
          gnutar
          gzip
          # Python + uv: uvx で awslabs.cloudwatch-mcp-server と mcp-proxy を実行
          python3
          uv
          # libstdc++: awslabs.cloudwatch-mcp-server が内部で numpy を import し、
          # numpy の C-extension が libstdc++.so.6 を dlopen する。nix の minimal
          # image だと libstdc++ は coreutils/python と別 package で入らないので、
          # ここで stdenv.cc.cc.lib を明示的に追加し、Env の LD_LIBRARY_PATH で
          # dlopen が見つけられるようにする。
          (lib.getLib stdenv.cc.cc)
          # tini: PID 1 として子プロセス (mcp-proxy × 2) の signal を取り回す
          tini
        ];

        extraCommands = ''
          mkdir -p work tmp etc usr/bin
          chmod 1777 tmp
          echo "hosts: files dns" > etc/nsswitch.conf
          echo "root:x:0:0:root:/root:/bin/bash" > etc/passwd
          echo "root:x:0:" > etc/group
          # /usr/bin/env trampoline: start.sh の `#!/usr/bin/env bash` shebang を
          # kernel が解釈できるようにする。dockerTools は /bin だけ生成して
          # /usr/bin には何も置かないので、ここで /bin/env を symlink する。
          # （dev sandbox の flake.nix が同じ理由で同じ事をしている）
          ln -s /bin/env usr/bin/env
        '';

        config = {
          # tini を PID 1 にして start.sh を子プロセスとして起動。
          # mcp-proxy 群はさらにその下にぶら下がる。Ctrl-C / container stop で
          # 全員に SIGTERM が伝播する。
          Entrypoint = [ "/bin/tini" "--" ];
          Cmd        = [ "/work/packages/mcp-ops/start.sh" ];
          WorkingDir = "/work";
          Env = [
            "PATH=/bin"
            "HOME=/root"
            "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
            "TZ=Asia/Tokyo"
            "UV_CACHE_DIR=/root/.cache/uv"
            # numpy / scipy など C-extension が libstdc++.so.6 を dlopen するため。
            # contents に追加した stdenv.cc.cc.lib (= libstdc++) の path を渡す。
            "LD_LIBRARY_PATH=${pkgs.lib.getLib pkgs.stdenv.cc.cc}/lib"
            "MCP_OPS_GH_PORT=7001"
            "MCP_OPS_AWS_PORT=7002"
          ];
        };
      };

      pkgsLinux = import nixpkgs {
        system = "aarch64-linux";
      };
    in {
      packages.aarch64-darwin.opsImage = mkOpsImage pkgsLinux;
      packages.aarch64-linux.opsImage  = mkOpsImage pkgsLinux;
    };
}
