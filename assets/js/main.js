(function () {
  "use strict";

  const getByPath = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
  let activateService = null;
  const gmailComposeUrl = (recipient, subject = "", body = "") => {
    const params = new URLSearchParams({ view: "cm", fs: "1", to: recipient });
    if (subject) params.set("su", subject);
    if (body) params.set("body", body);
    return `https://mail.google.com/mail/?${params.toString()}`;
  };

  function populateCompanyData() {
    if (!window.COMPANY_DATA) return;

    const hasEmail = Boolean(window.COMPANY_DATA.contato.email);

    document.querySelectorAll("[data-company]").forEach((element) => {
      const value = getByPath(window.COMPANY_DATA, element.dataset.company);
      if (value !== undefined) element.textContent = value;
    });

    document.querySelectorAll("[data-company-href]").forEach((element) => {
      const kind = element.dataset.companyHref;
      if (kind === "mailto") {
        if (!hasEmail) {
          element.hidden = true;
          return;
        }
        element.href = gmailComposeUrl(window.COMPANY_DATA.contato.email);
        element.target = "_blank";
        element.rel = "noopener";
      }
      if (kind === "tel") element.href = `tel:${window.COMPANY_DATA.contato.telefoneLink}`;
      if (kind === "maps") {
        element.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(window.COMPANY_DATA.endereco.completo)}`;
      }
    });

    document.querySelectorAll("[data-company-map]").forEach((frame) => {
      frame.src = `https://maps.google.com/maps?q=${encodeURIComponent(window.COMPANY_DATA.endereco.completo)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
    });

    document.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = new Date().getFullYear();
    });

    if (!hasEmail) {
      document.querySelector("[data-copy-email]")?.setAttribute("hidden", "");
      document.querySelector("[data-contact-form]")?.setAttribute("hidden", "");
    }
  }

  function initNavigation() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav-menu]");
    if (!toggle || !nav) return;

    const close = () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    };

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("menu-open", isOpen);
    });

    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
    document.addEventListener("keydown", (event) => event.key === "Escape" && close());
  }

  function initContactForm() {
    const form = document.querySelector("[data-contact-form]");
    const status = document.querySelector("[data-form-status]");
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const nome = String(data.get("nome") || "").trim();
      const email = String(data.get("email") || "").trim();
      const codigo = String(data.get("codigo") || "+55");
      const telefone = String(data.get("telefone") || "").trim();
      const assunto = String(data.get("assunto") || "Consultoria contábil");
      const mensagem = String(data.get("mensagem") || "").trim();
      const subject = `Contato pelo site: ${assunto}`;
      const body = (
        `${mensagem}\n\nNome: ${nome}\nE-mail: ${email}\nTelefone: ${codigo} ${telefone}`
      );

      if (status) {
        status.hidden = false;
        status.textContent = "O Gmail foi aberto em uma nova aba com a mensagem preenchida.";
      }

      const compose = gmailComposeUrl(window.COMPANY_DATA.contato.email, subject, body);
      const emailWindow = window.open(compose, "_blank");
      if (emailWindow) emailWindow.opener = null;
      else window.location.href = compose;
    });
  }

  function initCopyEmail() {
    const button = document.querySelector("[data-copy-email]");
    if (!button || !window.COMPANY_DATA) return;

    button.addEventListener("click", async () => {
      const email = window.COMPANY_DATA.contato.email;
      try {
        await navigator.clipboard.writeText(email);
      } catch {
        const field = document.createElement("textarea");
        field.value = email;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }

      const original = button.textContent;
      button.textContent = "E-mail copiado";
      window.setTimeout(() => { button.textContent = original; }, 1800);
    });
  }

  function initCookies() {
    const notice = document.querySelector("[data-cookie-notice]");
    if (!notice) return;
    const consent = localStorage.getItem("bf-cookie-consent");
    if (!consent) notice.classList.add("is-visible");
    notice.querySelector("[data-cookie-dismiss]")?.addEventListener("click", () => {
      localStorage.setItem("bf-cookie-consent", "essential");
      notice.classList.remove("is-visible");
    });
  }

  function initServiceTabs() {
    const tabs = Array.from(document.querySelectorAll("[data-service-tab]"));
    const title = document.querySelector("[data-service-title]");
    const description = document.querySelector("[data-service-description]");
    const index = document.querySelector("[data-service-index]");
    const lead = document.querySelector("[data-service-lead]");
    const progress = document.querySelector("[data-service-progress]");
    if (!tabs.length || !title || !description || !index) return;

    const services = [
      ["Contabilidade<br>empresarial", "Informação contábil confiável para decisões mais seguras e crescimento sustentável.", "Cuidamos da sua contabilidade com rigor técnico, visão estratégica e total conformidade, para que você tenha tranquilidade e mais tempo para focar no que realmente importa: o seu negócio."],
      ["Planejamento<br>tributário", "Estratégia fiscal responsável para escolhas mais consistentes.", "Analisamos o enquadramento e as operações da empresa para orientar caminhos tributários coerentes com a realidade do negócio."],
      ["Departamento<br>pessoal", "Rotinas trabalhistas organizadas com atenção às pessoas e às obrigações.", "Acompanhamos admissões, folha, encargos, férias e demais processos para dar previsibilidade à gestão das relações de trabalho."],
      ["Consultoria<br>empresarial", "Informação transformada em critério para organizar, proteger e crescer.", "Conectamos leitura contábil e visão empresarial para tornar riscos mais claros, prioridades mais objetivas e decisões mais seguras."]
    ];

    let activePosition = -1;

    activateService = (position) => {
      if (position === activePosition) return;
      activePosition = position;
      tabs.forEach((tab, current) => tab.classList.toggle("is-active", current === position));
      const update = () => {
        title.innerHTML = services[position][0];
        if (lead) lead.textContent = services[position][1];
        description.textContent = services[position][2];
        index.textContent = `${String(position + 1).padStart(2, "0")} / 04`;
        if (progress) progress.style.transform = `scaleX(${(position + 1) / 4})`;
      };

      update();
    };

    tabs.forEach((tab, position) => tab.addEventListener("click", () => activateService(position)));
    activateService(0);
  }

  document.addEventListener("DOMContentLoaded", () => {
    populateCompanyData();
    initNavigation();
    initContactForm();
    initCopyEmail();
    initCookies();
    initServiceTabs();
  });
})();

