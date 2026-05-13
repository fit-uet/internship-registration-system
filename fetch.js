fetch("https://docs.google.com/spreadsheets/d/1VVH_O6glb3e9ugXa7SZcm0JuSNxm9NtarHRKubwJeY4/export?format=csv&gid=0").then(r => r.text()).then(console.log);
