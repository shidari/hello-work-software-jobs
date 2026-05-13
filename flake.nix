{
  description = "Hello Work job searcher — dev sandbox OCI image";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      mkImage = pkgs: pkgs.dockerTools.buildLayeredImage {
        name = "sho-sandbox";
        tag  = "latest";

        contents = with pkgs; [
          # base userland
          bashInteractive
          coreutils
          gnugrep
          gnused
          gawk
          findutils
          which
          less
          gnutar
          gzip
          unzip
          curl
          openssh
          git
          jq
          cacert
          tzdata
          # glibc bin output: getconf / ldd / getent / locale / iconv 等。
          # VSCode Dev Containers の check-requirements.sh が getconf で
          # GNU_LIBC_VERSION を引くのを通すために必要。
          glibc.bin

          # langs / runtimes
          nodejs_24
          pnpm
          deno

          # cli tools
          gh
          # AWS CLI は dev sandbox からは撤去。実 AWS への診断は ops container
          # (packages/mcp-ops) の awslabs.aws-api-mcp-server / cloudwatch-mcp-server
          # 経由で MCP で行う（読み取り専用）。LocalStack は docker compose の
          # localstack 公式 image に同梱されている `awslocal` を `docker compose
          # exec` 経由で呼ぶ。
          # claude-code / wrangler / vercel など npm 配布物は pnpm 管理に逃がす
          # （nixpkgs 経由だと pnpm install が VM disk を食い潰す or 重い）。
          # container 内で pnpm 側から PATH を通す前提。

          # browser (chromium のみ。playwright-driver.browsers は firefox/webkit
          # も同梱するので避ける)
          playwright-driver.browsers-chromium
        ];

        # /work is the bind-mount target; /tmp is conventional. Both must exist
        # in the rootfs even before the host mount lands. nsswitch lets glibc
        # resolve DNS via /etc/resolv.conf (populated by Apple container).
        # passwd/group give uid 0 a name so `id -un` and friends (notably
        # VSCode Dev Containers' attach probe) succeed.
        # /usr/bin/env trampoline lets `#!/usr/bin/env <interp>` shebangs
        # (used by VSCode Dev Containers helpers and most third-party scripts)
        # resolve, since nix puts everything under /nix/store and only populates
        # /bin via dockerTools — /usr/bin is otherwise absent.
        # ld.so.cache: nix の ldconfig は build 時に cache path を nix store
        # 内の read-only path (=glibc.out/etc/ld.so.cache) に焼き付けてしまう
        # ため、VSCode Dev Containers の check-requirements.sh が ldconfig -p
        # で cache を引こうとすると "Can't open cache file" で落ちる。build
        # 時に /etc/ld.so.cache を生成 + ldconfig wrapper で必ず -C を付け
        # させる。
        extraCommands = ''
          mkdir -p work tmp etc usr/bin sbin
          chmod 1777 tmp
          echo "hosts: files dns" > etc/nsswitch.conf
          echo "root:x:0:0:root:/root:/bin/bash" > etc/passwd
          echo "root:x:0:" > etc/group
          ln -s /bin/env usr/bin/env

          # Pre-populate /etc/ld.so.cache with glibc + libstdc++ from nix store.
          {
            echo "${pkgs.glibc}/lib"
            echo "${pkgs.stdenv.cc.cc.lib}/lib"
          } > etc/ld.so.conf
          ${pkgs.glibc.bin}/bin/ldconfig -C etc/ld.so.cache -f etc/ld.so.conf

          # /sbin/ldconfig wrapper that always uses /etc/ld.so.cache, since
          # nix-built ldconfig defaults to a /nix/store path that's read-only
          # and not pre-generated. /bin/ldconfig は dockerTools が nix store
          # 直リンクで作るので触らない（read-only な /bin に rm が効かない）。
          # VSCode Dev Containers が叩くのは /sbin/ldconfig なのでこれで足りる。
          rm -f sbin/ldconfig
          cat > sbin/ldconfig <<'SCRIPT'
          #!/bin/bash
          exec __LDCONFIG__ -C /etc/ld.so.cache "$@"
          SCRIPT
          sed -i "s|__LDCONFIG__|${pkgs.glibc.bin}/bin/ldconfig|" sbin/ldconfig
          chmod +x sbin/ldconfig

          # Dynamic linker symlink for prebuilt non-nix binaries (vscode-server
          # ships its own node compiled for Debian, which has the canonical
          # FHS interpreter path /lib/ld-linux-aarch64.so.1 baked into ELF
          # header). Point that path at glibc's actual ld-linux from nix store.
          ln -sf ${pkgs.glibc}/lib/ld-linux-aarch64.so.1 lib/ld-linux-aarch64.so.1
        '';

        config = {
          Cmd        = [ "/bin/bash" ];
          WorkingDir = "/work";
          Env = [
            "PATH=/work/node_modules/.bin:/bin"
            "HOME=/root"
            "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
            "NIX_SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
            "PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers-chromium}"
            "TZ=Asia/Tokyo"
            # Prebuilt non-nix binaries (vscode-server's bundled node, extension
            # native modules 等) は RPATH を持たず /etc/ld.so.cache も nix の
            # ld-linux からは参照されないので、LD_LIBRARY_PATH に glibc / gcc
            # の lib path を baked in する。nix-built binary は RPATH が効くので
            # この LD_LIBRARY_PATH の影響を受けない。
            "LD_LIBRARY_PATH=${pkgs.glibc}/lib:${pkgs.stdenv.cc.cc.lib}/lib"
            # Sandbox marker: scripts/assert-in-sandbox.sh と
            # .claude/hooks/deny-host.sh はこの env の有無で host vs sandbox を
            # 判別する。host 側には絶対に export されない値を維持すること。
            "SHO_SANDBOX=1"
          ];
        };
      };

      pkgsLinux = import nixpkgs {
        system = "aarch64-linux";
      };
    in {
      # Build target: linux/arm64 image.
      # Evaluating from a darwin host requires nix-darwin's linux-builder
      # (or any other aarch64-linux remote builder).
      # ops image は packages/mcp-ops/flake.nix に分離されている（dev とは
      # 独立 lock / 独立 bump cycle で運用するため）。
      packages.aarch64-darwin.sandboxImage = mkImage pkgsLinux;
      packages.aarch64-linux.sandboxImage  = mkImage pkgsLinux;
    };
}
