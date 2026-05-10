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

          # langs / runtimes
          nodejs_24
          pnpm
          deno

          # cli tools
          gh
          awscli2
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
        extraCommands = ''
          mkdir -p work tmp etc
          chmod 1777 tmp
          echo "hosts: files dns" > etc/nsswitch.conf
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
      packages.aarch64-darwin.sandboxImage = mkImage pkgsLinux;
      packages.aarch64-linux.sandboxImage  = mkImage pkgsLinux;
    };
}
