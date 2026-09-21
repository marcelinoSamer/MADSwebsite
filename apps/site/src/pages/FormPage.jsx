import { useParams } from 'react-router'
import { useQuery } from '@mads/db/react'
import PageHead from '../components/PageHead'
import AsyncState from '../components/AsyncState'
import FormRenderer from '../components/FormRenderer'

function FormPage() {
  const { slug } = useParams()
  const { data: form, loading, error } = useQuery((c) => c.forms.bySlug(slug), [slug])

  // Internal forms are reachable only from the admin panel, which is where
  // the sign-in lives. The public site should not hint at their contents.
  const isPublic = form?.audience === 'public'

  return (
    <>
      <PageHead
        mark="§ 07"
        eyebrow="Form"
        title={form && isPublic ? form.title : 'Form'}
        lead={form && isPublic ? form.description : undefined}
      />

      <section className="section page-body">
        <div className="container form-container">
          <AsyncState loading={loading} error={error}>
            {form && !isPublic && (
              <p className="state state-empty">
                This form is for committee members and is filled in from the admin panel.
              </p>
            )}
            {form && isPublic && !form.isOpen && (
              <p className="state state-empty">This form is closed for now.</p>
            )}
            {form && isPublic && form.isOpen && <FormRenderer form={form} />}
          </AsyncState>
        </div>
      </section>
    </>
  )
}

export default FormPage
