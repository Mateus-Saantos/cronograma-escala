export function createManagerModule({
    cloudDisponivel,
    sha256Hex,
    loadCronogramaById,
    showToast
}) {
    const managerPasswordOverlay =
        document.getElementById('managerPasswordOverlay');
    const managerPasswordClose =
        document.getElementById('managerPasswordClose');
    const managerPasswordCancel =
        document.getElementById('managerPasswordCancel');
    const managerPasswordSubmit =
        document.getElementById('managerPasswordSubmit');
    const managerPasswordInput =
        document.getElementById('managerPasswordInput');

    const managerListOverlay =
        document.getElementById('managerListOverlay');
    const managerListClose =
        document.getElementById('managerListClose');
    const managerListContent =
        document.getElementById('managerListContent');

    function openManagerPassword() {
        managerPasswordInput.value = '';
        managerPasswordOverlay.classList.add('open');
    }

    function closeManagerPassword() {
        managerPasswordOverlay.classList.remove('open');
    }

    async function openManagerList() {
        managerListContent.innerHTML =
            '<p class="manager-empty">Carregando...</p>';

        managerListOverlay.classList.add('open');

        try {
            const lista =
                await window.firebaseCronograma.listarIndice();

            if (!lista.length) {
                managerListContent.innerHTML =
                    '<p class="manager-empty">Nenhum cronograma encontrado.</p>';
                return;
            }

            lista.sort(
                (a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0)
            );

            managerListContent.innerHTML = '';

            lista.forEach(item => {
                const row = document.createElement('div');
                row.className = 'manager-item';

                // Mantido como no código original.
                row.innerHTML = `
          <div class="manager-item-info">
            <span class="manager-item-name">${item.nome || '(sem nome)'}</span>
            <span class="manager-item-meta">${item.tipo || '--'} · ${item.id}</span>
          </div>
          <button type="button">Visualizar</button>
        `;

                row.querySelector('button').addEventListener(
                    'click',
                    async () => {
                        managerListOverlay.classList.remove('open');
                        await loadCronogramaById(item.id, false);
                    }
                );

                managerListContent.appendChild(row);
            });
        } catch (e) {
            console.error('Erro ao listar cronogramas:', e);

            managerListContent.innerHTML =
                '<p class="manager-empty">Erro ao carregar a lista.</p>';
        }
    }

    function initManagerUI() {
        managerPasswordClose.addEventListener(
            'click',
            closeManagerPassword
        );

        managerPasswordCancel.addEventListener(
            'click',
            closeManagerPassword
        );

        managerPasswordOverlay.addEventListener('click', event => {
            if (event.target === managerPasswordOverlay) {
                closeManagerPassword();
            }
        });

        managerPasswordSubmit.addEventListener(
            'click',
            async () => {
                const senha = managerPasswordInput.value;

                if (!senha) {
                    showToast('Digite a senha');
                    return;
                }

                if (!cloudDisponivel()) {
                    showToast('Recurso online indisponível agora');
                    return;
                }

                try {
                    const hashCorreto =
                        await window.firebaseCronograma
                            .buscarHashSenhaGerenciador();

                    if (!hashCorreto) {
                        showToast('Gerenciador ainda não configurado');
                        return;
                    }

                    const hashDigitado = await sha256Hex(senha);

                    if (hashDigitado !== hashCorreto) {
                        showToast('Senha incorreta');
                        return;
                    }

                    closeManagerPassword();
                    await openManagerList();
                } catch (e) {
                    console.error(
                        'Erro ao validar senha do Gerenciador:',
                        e
                    );

                    showToast('Erro ao validar senha');
                }
            }
        );

        managerListClose.addEventListener('click', () => {
            managerListOverlay.classList.remove('open');
        });

        managerListOverlay.addEventListener('click', event => {
            if (event.target === managerListOverlay) {
                managerListOverlay.classList.remove('open');
            }
        });
    }

    return {
        initManagerUI,
        openManagerPassword,
        closeManagerPassword,
        openManagerList
    };
}