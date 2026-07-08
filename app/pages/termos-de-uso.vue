<template>
  <div class="w-full bg-white">
    <section class="bg-slate-100 border-b border-slate-200">
      <div class="max-w-[44rem] mx-auto px-6 pt-10 pb-9">
        <nav class="flex items-center gap-2 text-[13px] text-slate-500 mb-[18px]">
          <NuxtLink to="/" class="text-slate-500 no-underline">Início</NuxtLink>
          <span class="text-slate-300">/</span>
          <span class="text-slate-900 font-semibold">Termos de Uso</span>
        </nav>
        <h1
          class="text-[34px] font-extrabold tracking-[-0.025em] m-0 mb-2.5 text-slate-900"
        >
          Termos de Uso
        </h1>
        <p class="text-[15px] text-slate-500 m-0">
          Última atualização: 29 de junho de 2026
        </p>
      </div>
    </section>

    <article class="legal max-w-[44rem] mx-auto px-6 pt-10 pb-20">
      <p class="!text-[16.5px] !text-slate-700">
        Bem-vindo ao Meu Revelar. Ao usar nossa plataforma, você concorda com estes termos.
        Escrevemos tudo de forma direta, porque transparência é a base do que fazemos.
      </p>

      <h2>1. O que o Meu Revelar é (e o que não é)</h2>
      <p>
        O Meu Revelar é uma <b>plataforma independente de planejamento imobiliário e
        inteligência de crédito</b>. Oferecemos ferramentas de simulação e conteúdo
        educativo, e conectamos você a corretores parceiros credenciados.
      </p>
      <p>
        O Meu Revelar <b>não é um banco</b>, não é instituição financeira e <b>não concede
        crédito</b>. Não garantimos aprovação de financiamento, que depende exclusivamente
        da análise das instituições financeiras.
      </p>

      <h2>2. Natureza das simulações</h2>
      <p>
        Os valores apresentados pelo simulador — parcelas, juros, ITBI, custas de cartório
        e demais estimativas — são <b>aproximações para fins de planejamento</b>. Eles usam
        taxas e alíquotas de referência e podem diferir das condições reais oferecidas por
        bancos e cobradas por prefeituras e cartórios. Nenhuma simulação constitui oferta,
        proposta ou garantia de crédito.
      </p>

      <h2>3. Uso adequado da plataforma</h2>
      <ul>
        <li>Você se compromete a fornecer informações verdadeiras nos formulários.</li>
        <li>Você não deve usar a plataforma para fins ilícitos ou que violem direitos de terceiros.</li>
        <li>O conteúdo dos guias é informativo e não substitui aconselhamento profissional individual.</li>
      </ul>

      <h2>4. Conexão com corretor parceiro</h2>
      <p>
        Ao enviar seus dados, você poderá ser contatado por nossa equipe e por um corretor
        de imóveis parceiro credenciado, conforme detalhado na nossa
        <NuxtLink to="/politica-de-privacidade">Política de Privacidade</NuxtLink>. O
        serviço de simulação e a conexão são <b>gratuitos</b> para você.
      </p>

      <h2>5. Propriedade intelectual</h2>
      <p>
        A marca Meu Revelar, o conteúdo dos guias, o design e o código da plataforma são
        protegidos por direitos de propriedade intelectual. O uso não autorizado é
        proibido.
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        O Meu Revelar se esforça para manter as informações corretas e atualizadas, mas não se
        responsabiliza por decisões tomadas exclusivamente com base nas simulações.
        Recomendamos sempre confirmar valores com a instituição financeira, a prefeitura e
        o cartório competentes.
      </p>

      <h2>7. Alterações nos termos</h2>
      <p>
        Podemos atualizar estes termos a qualquer momento. A versão vigente estará sempre
        disponível nesta página, com a data de atualização indicada no topo.
      </p>

      <h2>8. Foro</h2>
      <p>
        Estes termos são regidos pelas leis brasileiras. Eventuais controvérsias serão
        dirimidas no foro do domicílio do usuário, conforme o Código de Defesa do
        Consumidor.
      </p>

      <div class="mt-10 pt-6 border-t border-slate-100">
        <NuxtLink
          to="/politica-de-privacidade"
          class="text-[15px] text-brand font-semibold no-underline"
          >Ver também: Política de Privacidade →</NuxtLink
        >
      </div>
    </article>
  </div>
</template>
