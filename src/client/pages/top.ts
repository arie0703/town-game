import { api, ApiError } from '../api';
import { fetchMe } from '../auth';
import { ACCOUNT } from '../../shared/config';

export async function renderTop(root: HTMLElement): Promise<void> {
  if (await fetchMe()) {
    location.hash = '#/home';
    return;
  }

  root.innerHTML = `
    <h1>TOWN</h1>
    <p>ようこそ、町へ。</p>
    <p class="error" id="error" hidden></p>
    <div class="columns">
      <form class="box" id="login-form">
        <h2>ログイン</h2>
        <label>名前 <input name="name" required autocomplete="username" /></label>
        <label>パスワード <input name="password" type="password" required autocomplete="current-password" /></label>
        <button type="submit">ログイン</button>
      </form>
      <form class="box" id="register-form">
        <h2>住民登録</h2>
        <label>名前（${ACCOUNT.nameMinLength}〜${ACCOUNT.nameMaxLength}文字）
          <input name="name" required minlength="${ACCOUNT.nameMinLength}" maxlength="${ACCOUNT.nameMaxLength}" autocomplete="username" />
        </label>
        <label>パスワード（${ACCOUNT.passwordMinLength}文字以上）
          <input name="password" type="password" required minlength="${ACCOUNT.passwordMinLength}" autocomplete="new-password" />
        </label>
        <button type="submit">登録して町に入る</button>
      </form>
    </div>
  `;

  const error = root.querySelector<HTMLParagraphElement>('#error')!;

  const bind = (formId: string, path: string) => {
    const form = root.querySelector<HTMLFormElement>(formId)!;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const button = form.querySelector('button')!;
      button.disabled = true;
      try {
        await api.post(path, { name: data.get('name'), password: data.get('password') });
        location.hash = '#/home';
      } catch (err) {
        error.textContent = err instanceof ApiError ? err.message : '通信エラーが発生しました';
        error.hidden = false;
      } finally {
        button.disabled = false;
      }
    });
  };
  bind('#login-form', '/login');
  bind('#register-form', '/register');
}
